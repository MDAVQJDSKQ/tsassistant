# backend_server.py
from fastapi import FastAPI, HTTPException # Added HTTPException
from pydantic import BaseModel
import uvicorn

# --- Add CORS Middleware ---
from fastapi.middleware.cors import CORSMiddleware

# LangChain imports
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
from langchain.schema import HumanMessage, AIMessage # Needed for memory

# Our config - fixed import to work when run directly
try:
    from backend.config import config  # This path works when imported as a module
except ImportError:
    from config import config  # This fallback works when run directly within the backend folder

# --- Memory Cache ---
# Simple in-memory dictionary to store memory objects per conversation
# WARNING: This is basic! Resets on server restart, not suitable for production.
memory_cache: dict[str, ConversationBufferWindowMemory] = {}
# --------------------

# Define the structure of the data we expect from the UI
class ChatRequest(BaseModel):
    messages: list[dict] # Expect list of {"role": "user"|"assistant", "content": "..."}
    conversation_id: str # ID for the specific chat session

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

@app.post("/api/chat")
async def handle_chat(request: ChatRequest):
    """
    Handles chat requests from the frontend.
    """
    print(f"Received request for conversation_id: {request.conversation_id}")
    conversation_id = request.conversation_id
    incoming_messages = request.messages

    # --- 1. Get/Create Conversation Memory ---
    if conversation_id not in memory_cache:
        print(f"Creating new memory for conversation_id: {conversation_id}")
        memory_cache[conversation_id] = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            input_key="human_input",
            k=config.memory_window_size
        )
        # Potential Enhancement: Try loading from file here if cache is empty?
        # For now, we rely solely on the in-memory cache per session.
        # The load/save functions in utils.py are NOT directly used here yet.

    memory = memory_cache[conversation_id]
    # --- End Memory Management ---

    # --- 2. Extract Last User Message ---
    last_user_message_content = ""
    if incoming_messages and incoming_messages[-1].get("role") == "user":
        last_user_message_content = incoming_messages[-1].get("content", "")
    else:
        # Handle cases where history is sent without a new user message,
        # or the format is unexpected.
        print("Warning: No user message found at the end of the request payload.")
        # Decide how to handle this - error or ignore? For now, return error.
        raise HTTPException(status_code=400, detail="No user message provided")
    # --- End Extract Message ---


    # --- 3. Instantiate LangChain components (can be reused) ---
    # These could potentially be initialized once outside the function
    # if they don't change per request, but fine here for now.
    llm = ChatOpenAI(
        model_name=config.model_name,
        openai_api_key=config.openrouter_api_key,
        openai_api_base=config.openrouter_api_base,
        temperature=config.temperature,
    )

    # Load the system prompt (consider caching this read operation)
    try:
        # Try multiple paths to find the system prompt
        possible_paths = [
            "backend/prompts/system_prompt.txt",  # When run from project root
            "prompts/system_prompt.txt",          # When run from backend directory
        ]
        
        for path in possible_paths:
            try:
                with open(path, "r", encoding="utf-8") as file:
                    system_message = file.read()
                    print(f"Successfully loaded system prompt from {path}")
                    break
            except FileNotFoundError:
                continue
        else:  # This runs if no break occurred in the for loop
            raise FileNotFoundError("Could not find system prompt file in any expected location")
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
    # This part is similar to your script, but uses the retrieved 'memory'
    load_memory = RunnableLambda(lambda _: memory.load_memory_variables({}))

    chain_input = RunnablePassthrough.assign(
        chat_history=load_memory | RunnableLambda(lambda mem: mem.get('chat_history', [])),
        system_message=lambda x: x['system_message'],
        human_input=lambda x: x['human_input']
    )

    chain = (
        chain_input
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
        # Use the specific 'memory' instance for this conversation_id
        memory.save_context(
            {"human_input": last_user_message_content},
            {"output": ai_response_content}
        )
        # -----------------------------------------

        # --- 6. Return Response ---
        # Check AI SDK docs for the exact structure it needs.
        # Simple JSON object for now.
        return {"role": "assistant", "content": ai_response_content}
        # --- End Return ---

    except Exception as e:
        print(f"Error invoking LangChain chain: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {e}")


# --- Add logic to run the server if this script is executed directly ---
# This is useful for development
if __name__ == "__main__":
    # When run directly, use the app directly
    uvicorn.run(
        "backend.backend_server:app" if __package__ == "backend" else "backend_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )