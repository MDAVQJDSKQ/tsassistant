# Run the backend server using: python -m backend.backend_server

# backend_server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
import uvicorn
from typing import List, Dict # Added for response models
import os
import json

# --- Add CORS Middleware ---
from fastapi.middleware.cors import CORSMiddleware

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain.schema import HumanMessage, AIMessage # Needed for memory

# Our config and utils
try:
    from backend.config import config  # This path works when imported as a module
    from backend.utils import (
        save_conversation_history,
        load_conversation_history,
        generate_new_conversation_id,
        list_conversations
    )
except ImportError:
    from config import config  # This fallback works when run directly within the backend folder
    from utils import (
        save_conversation_history,
        load_conversation_history,
        generate_new_conversation_id,
        list_conversations
    )


# --- Memory Cache ---
# Simple in-memory dictionary to store memory objects per conversation
# WARNING: This is basic! Resets on server restart, not suitable for production.
memory_cache: dict[str, ConversationBufferWindowMemory] = {}
# --------------------

# === Conversation-level configuration =========================
VALID_MODELS = {
    "anthropic/claude-3.5-haiku",
    "anthropic/claude-3.7-sonnet",
    "anthropic/claude-3-opus",
    "openai/gpt-4",
    "openai/gpt-3.5-turbo",
    "openai/gpt-4.1-nano",
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1",
    "x-ai/grok-3-mini-beta",
    "google/gemma-3-12b-it:free",
    "google/gemini-2.5-flash-preview",
}
DEFAULT_SYSTEM_PATHS = [
    "backend/prompts/system_prompt.txt",
    "prompts/system_prompt.txt",
]
TEMP_MIN, TEMP_MAX = 0.0, 2.0

def _clamp_temperature(t: float | None) -> float:
    if t is None:
        from backend.config import config
        return config.temperature
    return max(TEMP_MIN, min(TEMP_MAX, t))
# ==============================================================

# Define the structure of the data we expect from the UI
class ChatRequest(BaseModel):
    messages: list[dict]
    conversation_id: str
    model_name: str | None = None
    system_directive: str | None = None
    temperature: float | None = None

    @field_validator("model_name")
    @classmethod
    def check_model(cls, v):
        if v is not None and v not in VALID_MODELS:
            raise ValueError(f"Unsupported model: {v}")
        return v

    @field_validator("temperature")
    @classmethod
    def check_temp(cls, v):
        if v is not None and not (TEMP_MIN <= v <= TEMP_MAX):
            raise ValueError(f"Temperature must be {TEMP_MIN}-{TEMP_MAX}")
        return v

class ConversationConfig(BaseModel):
    conversation_id: str
    model_name: str | None = None
    system_directive: str | None = None
    temperature: float | None = None

    @field_validator("model_name")
    @classmethod
    def check_model(cls, v):
        if v is not None and v not in VALID_MODELS:
            raise ValueError(f"Unsupported model: {v}")
        return v

    @field_validator("temperature")
    @classmethod
    def check_temp(cls, v):
        if v is not None and not (TEMP_MIN <= v <= TEMP_MAX):
            raise ValueError(f"Temperature must be {TEMP_MIN}-{TEMP_MAX}")
        return v

class NewConversationResponse(BaseModel):
    conversation_id: str

# Instantiate the FastAPI app
app = FastAPI()

# --- Configure CORS ---
origins = [
    "http://localhost", # Base domain for localhost
    "http://localhost:3000", # Common React dev port - ADJUST IF YOURS IS DIFFERENT
    # Add any other origins you might need (e.g., your deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # List of origins allowed
    allow_credentials=True, # Allow cookies (if needed later)
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)
# ---------------------

def load_conversation_config(conversation_id: str) -> dict:
    cfg_path = os.path.join("conversations", conversation_id, "config.json")
    if os.path.exists(cfg_path):
        with open(cfg_path, "r") as f:
            return json.load(f)
    from backend.config import config
    return {
        "model_name": config.model_name,
        "system_directive": None,
        "temperature": config.temperature,
    }

@app.post("/api/chat")
async def handle_chat(request: ChatRequest):
    """
    Handles chat requests from the frontend.
    """
    print(f"Received request for conversation_id: {request.conversation_id}")
    conversation_id = request.conversation_id
    incoming_messages = request.messages

    # ---- merge global → stored → request -----------------
    stored_cfg = load_conversation_config(conversation_id)
    current_model       = request.model_name       or stored_cfg["model_name"]
    current_temperature = _clamp_temperature(
        request.temperature if request.temperature is not None
        else stored_cfg["temperature"]
    )
    custom_directive    = (
        request.system_directive
        if request.system_directive is not None
        else stored_cfg.get("system_directive")
    )
    # -------------------------------------------------------

    # --- 1. Get/Create Conversation Memory ---
    if conversation_id not in memory_cache:
        print(f"Creating new memory for conversation_id: {conversation_id}")
        current_memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            input_key="human_input",
            k=config.memory_window_size
        )
        memory_cache[conversation_id] = current_memory
        # --- Load from file if exists ---
        print(f"Attempting to load history for new/cached conversation_id: {conversation_id}")
        loaded = load_conversation_history(current_memory, conversation_id)
        if loaded:
            print(f"Successfully loaded history for {conversation_id} into memory cache.")
        else:
            print(f"No existing history found for {conversation_id}, or error during load. Starting fresh.")
        # --- End Load ---

    memory = memory_cache[conversation_id]
    # --- End Memory Management ---

    # --- 2. Extract Last User Message ---
    last_user_message_content = ""
    if incoming_messages and incoming_messages[-1].get("role") == "user":
        last_user_message_content = incoming_messages[-1].get("content", "")
    else:
        print("Warning: No user message found at the end of the request payload.")
        raise HTTPException(status_code=400, detail="No user message provided")
    # --- End Extract Message ---


    # --- 3. Instantiate LangChain components (can be reused) ---
    llm = ChatOpenAI(
        model_name=current_model,
        openai_api_key=config.openrouter_api_key,
        openai_api_base=config.openrouter_api_base,
        temperature=current_temperature,
    )

    try:
        if custom_directive:
            system_message = custom_directive
        else:
            system_message = None
            for p in DEFAULT_SYSTEM_PATHS:
                try:
                    with open(p, "r", encoding="utf-8") as fh:
                        system_message = fh.read()
                        break
                except FileNotFoundError:
                    continue
            if system_message is None:
                raise HTTPException(500, "System prompt file missing")
    except FileNotFoundError as e:
         raise HTTPException(status_code=500, detail=f"System prompt file not found: {e}")


    template = """{system_message}

        Previous conversation:
        {chat_history}

        New human input: {human_input}
        Response:"""

    prompt = PromptTemplate(
        input_variables=["system_message", "chat_history", "human_input"],
        template=template
    )

    # --- 4. Define and Run Chain ---
    load_memory_runnable = RunnableLambda(lambda _: memory.load_memory_variables({}))

    chain_input_passthrough = RunnablePassthrough.assign(
        chat_history=load_memory_runnable | RunnableLambda(lambda mem: mem.get('chat_history', [])),
        system_message=lambda x: x['system_message'],
        human_input=lambda x: x['human_input']
    )

    chain = (
        chain_input_passthrough
        | prompt
        | llm
        | StrOutputParser()
    )

    chain_input_dict = {
        "human_input": last_user_message_content,
        "system_message": system_message
    }

    try:
        print("Invoking chain...")
        ai_response_content = chain.invoke(chain_input_dict)
        print(f"Chain response: {ai_response_content}")

        # --- 5. Update Memory (In-Memory Cache) ---
        memory.save_context(
            {"human_input": last_user_message_content},
            {"output": ai_response_content}
        )
        # --- Save to file ---
        print(f"Attempting to save conversation {conversation_id} to disk.")
        save_path = save_conversation_history(memory, conversation_id)
        if save_path:
            print(f"Conversation {conversation_id} successfully saved to {save_path}")
        else:
            print(f"Failed to save conversation {conversation_id} to disk.")
        # --- End Save ---
        # -----------------------------------------

        # --- 6. Return Response ---
        return {"role": "assistant", "content": ai_response_content}
        # --- End Return ---

    except Exception as e:
        print(f"Error invoking LangChain chain: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {e}")

@app.get("/api/conversations", response_model=List[Dict[str, str]])
async def get_conversations_list_endpoint():
    try:
        print("API: Request to list conversations received.")
        conversations_data = list_conversations()
        print(f"API: Found conversations: {conversations_data}")
        return conversations_data
    except Exception as e:
        print(f"API Error: Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail="Failed to list conversations")

@app.post("/api/conversations/new", response_model=NewConversationResponse)
async def create_new_conversation_endpoint():
    try:
        new_id = generate_new_conversation_id()
        print(f"API: Generated new conversation ID: {new_id}")
        # No need to create memory or file here; /api/chat will handle it on first message.
        return {"conversation_id": new_id}
    except Exception as e:
        print(f"API Error: Error generating new conversation ID: {e}")
        raise HTTPException(status_code=500, detail="Failed to create new conversation")

@app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages_endpoint(conversation_id: str):
    """
    Retrieves the messages for a specific conversation ID.
    """
    try:
        print(f"API: Request to get messages for conversation_id: {conversation_id}")
        # Create a temporary memory to load the conversation
        temp_memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            input_key="human_input",
            k=config.memory_window_size
        )
        
        loaded = load_conversation_history(temp_memory, conversation_id)
        if not loaded:
            raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
            
        # Extract messages from memory
        messages = []
        if hasattr(temp_memory, 'chat_memory') and hasattr(temp_memory.chat_memory, 'messages'):
            for msg in temp_memory.chat_memory.messages:
                if isinstance(msg, HumanMessage):
                    messages.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    messages.append({"role": "assistant", "content": msg.content})
        
        return {"conversation_id": conversation_id, "messages": messages}
    except HTTPException:
        raise
    except Exception as e:
        print(f"API Error: Error getting conversation messages: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get conversation messages: {e}")

@app.post("/api/conversations/config")
async def save_conversation_config(cfg: ConversationConfig):
    try:
        cfg.temperature = _clamp_temperature(cfg.temperature)
        cfg_dir = os.path.join("conversations", cfg.conversation_id)
        os.makedirs(cfg_dir, exist_ok=True)
        with open(os.path.join(cfg_dir, "config.json"), "w") as f:
            json.dump(cfg.dict(), f, indent=2)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(500, f"Failed to save configuration: {e}")

@app.get("/api/conversations/{conversation_id}/config")
async def get_conversation_config(conversation_id: str):
    try:
        data = load_conversation_config(conversation_id)
        data["conversation_id"] = conversation_id
        return data              # always 200
    except Exception as e:
        raise HTTPException(500, f"Failed to load configuration: {e}")

# --- Add logic to run the server if this script is executed directly ---
if __name__ == "__main__":
    uvicorn.run(
        "backend.backend_server:app" if __package__ == "backend" else "backend_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )