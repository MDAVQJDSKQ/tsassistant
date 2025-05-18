# Run the backend server using: python -m backend.backend_server

# backend_server.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, field_validator
import uvicorn
from typing import List, Dict, Any  # Added for response models
import os
import json
import uuid  # Add this import
import time
import shutil  # Add this for directory deletion

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
    from backend.config import config as global_app_config # Import global config
    from backend.utils import (
        save_conversation_history,
        load_conversation_history,
        generate_new_conversation_id,
        list_conversations,
        generate_chat_title # The refactored one
    )
except ImportError:
    from config import config as global_app_config # Fallback for global config
    from utils import (
        save_conversation_history,
        load_conversation_history,
        generate_new_conversation_id,
        list_conversations,
        generate_chat_title # The refactored one
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
    last_message_time: float | None = None  # Unix timestamp of the last message

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

# Settings model for application-wide settings
class SettingsModel(BaseModel):
    central_model: str
    api_key: str | None = None
    title_generation_prompt: str | None = None

    @field_validator("central_model")
    @classmethod
    def check_central_model(cls, v):
        valid_models = ["claude-3.5-haiku", "claude-3.7-sonnet"]
        if v not in valid_models:
            raise ValueError(f"Invalid central model: {v}. Must be one of {valid_models}")
        return v

class NewConversationResponse(BaseModel):
    conversation_id: str

class ConversationListItem(BaseModel):
    id: str
    name: str
    title: str | None = None  # Add title field with default of None
    last_message_time: float | None = None  # Allow both float and None for the timestamp

# Instantiate the FastAPI app
app = FastAPI()

# Define CONVERSATIONS_DIR if not already globally available
# Ensure this path is correct relative to where backend_server.py is run.
# If backend_server.py is run from the root of the project, "backend/conversations" is correct.
# If run from within the "backend" folder, "conversations" would be correct.
# Given the import style (from backend.utils), it's likely run from the root.
CONVERSATIONS_DIR = os.path.join("backend", "conversations")

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

def get_config_path(conversation_id: str) -> str:
    """Helper to get the full path to a conversation's config file."""
    return os.path.join(CONVERSATIONS_DIR, conversation_id, "config.json")

def load_conversation_config(conversation_id: str) -> dict:
    cfg_path = get_config_path(conversation_id)
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
            k=global_app_config.memory_window_size
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
        openai_api_key=global_app_config.openrouter_api_key,
        openai_api_base=global_app_config.openrouter_api_base,
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
        
        # --- Update the last_message_time in config ---
        try:
            current_time = time.time()
            # Load existing config
            cfg_dir = os.path.join("backend", "conversations", conversation_id)
            cfg_path = os.path.join(cfg_dir, "config.json")
            
            # Ensure directory exists
            os.makedirs(cfg_dir, exist_ok=True)
            
            # Load existing config or create default
            cfg_data = {
                "conversation_id": conversation_id,
                "model_name": current_model,
                "system_directive": custom_directive,
                "temperature": current_temperature,
            }
            
            # Try to read existing config if it exists
            if os.path.exists(cfg_path):
                try:
                    with open(cfg_path, 'r') as f:
                        existing_data = json.load(f)
                        # Merge with defaults
                        cfg_data.update(existing_data)
                except Exception as e:
                    print(f"Error reading existing config (will create new): {e}")
            
            # Update timestamp
            cfg_data["last_message_time"] = current_time
            
            # Write back to file
            with open(cfg_path, 'w') as f:
                json.dump(cfg_data, f, indent=2)
                
            print(f"Updated last_message_time for conversation {conversation_id}")
        except Exception as e:
            print(f"Error updating last_message_time (non-critical): {e}")
        # --- End update timestamp ---

        # --- 6. Return Response ---
        return {"role": "assistant", "content": ai_response_content}
        # --- End Return ---

    except Exception as e:
        print(f"Error invoking LangChain chain: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {e}")

@app.get("/api/conversations", response_model=List[ConversationListItem])
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
            k=global_app_config.memory_window_size
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
        cfg_dir = os.path.join("backend", "conversations", cfg.conversation_id)
        os.makedirs(cfg_dir, exist_ok=True)
        
        # Save to file
        cfg_path = os.path.join(cfg_dir, "config.json")
        
        # If the file already exists, read existing values to merge with new values
        existing_data = {}
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, "r") as f:
                    existing_data = json.load(f)
            except Exception as e:
                print(f"Error reading existing config: {e}")
        
        # Convert Pydantic model to dict
        new_data = cfg.dict(exclude_unset=True)
        
        # Merge data, new values override existing ones
        merged_data = {**existing_data, **new_data}
        
        # Write to file
        with open(cfg_path, "w") as f:
            json.dump(merged_data, f, indent=2)
            
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

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation_endpoint(conversation_id: str):
    """
    Delete a conversation and all its data (both config directory and history file)
    """
    try:
        # Config directory path
        conversation_dir = os.path.join("backend", "conversations", conversation_id)
        
        # History file path
        history_file = os.path.join("backend", "conversations", "history", f"{conversation_id}.json")
        
        deleted_something = False
        
        # Delete the config directory if it exists
        if os.path.exists(conversation_dir):
            print(f"Deleting conversation config directory: {conversation_dir}")
            shutil.rmtree(conversation_dir)
            deleted_something = True
            
        # Delete the history file if it exists
        if os.path.exists(history_file):
            print(f"Deleting conversation history file: {history_file}")
            os.remove(history_file)
            deleted_something = True
            
        # If neither existed, raise a 404
        if not deleted_something:
            raise HTTPException(status_code=404, detail=f"Conversation {conversation_id} not found")
        
        # Also remove from memory cache if it exists
        if conversation_id in memory_cache:
            del memory_cache[conversation_id]
            
        return {"success": True, "message": f"Conversation {conversation_id} deleted successfully"}
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {e}")

@app.post("/settings")
async def update_settings(settings: SettingsModel):
    """
    Update application-wide settings
    """
    try:
        # Ensure settings directory exists
        settings_dir = os.path.join("backend", "settings")
        os.makedirs(settings_dir, exist_ok=True)
        
        # Save settings to a file
        settings_path = os.path.join(settings_dir, "app_settings.json")
        
        # Read existing settings if they exist
        existing_settings = {}
        if os.path.exists(settings_path):
            with open(settings_path, "r") as f:
                try:
                    existing_settings = json.load(f)
                except json.JSONDecodeError:
                    # File exists but is not valid JSON, overwrite it
                    pass
        
        # Update with new settings
        existing_settings["central_model"] = settings.central_model
        
        # Only update API key if provided
        if settings.api_key:
            # In production you would store this more securely
            existing_settings["api_key"] = settings.api_key
            
        # Update title generation prompt if provided
        if settings.title_generation_prompt is not None:
            existing_settings["title_generation_prompt"] = settings.title_generation_prompt
        
        # Write back to file
        with open(settings_path, "w") as f:
            json.dump(existing_settings, f)
        
        return {"success": True, "message": "Settings updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@app.get("/settings")
async def get_settings():
    """
    Get current application-wide settings
    """
    settings_path = os.path.join("backend", "settings", "app_settings.json")
    
    if not os.path.exists(settings_path):
        # Return defaults if no settings file exists
        return {
            "central_model": "claude-3.7-sonnet",
            "api_key_configured": False,
            "title_generation_prompt": None
        }
    
    try:
        with open(settings_path, "r") as f:
            settings = json.load(f)
            
        # Never return the actual API key, just if it's configured
        api_key_configured = "api_key" in settings and settings["api_key"] is not None
        
        return {
            "central_model": settings.get("central_model", "claude-3.7-sonnet"),
            "api_key_configured": api_key_configured,
            "title_generation_prompt": settings.get("title_generation_prompt", None)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load settings: {str(e)}")

@app.post("/api/conversations/{conversation_id}/generate-title")
async def generate_conversation_title_endpoint(conversation_id: str):
    """
    Generates a NEW title for a conversation based on its history using current app settings,
    and saves it to config.json.
    History is expected at: backend/conversations/history/<ID>.json
    Config is expected at: backend/conversations/<ID>/config.json
    """
    print(f"[endpoint.generate_title] Request for NEW title for {conversation_id}")

    # Path for FLAT history structure
    history_base_dir = os.path.join(CONVERSATIONS_DIR, "history") 
    history_path = os.path.join(history_base_dir, f"{conversation_id}.json")
    
    # Config path remains nested per conversation
    config_path = get_config_path(conversation_id) # Uses CONVERSATIONS_DIR/<id>/config.json

    if not os.path.exists(history_path):
        print(f"[endpoint.generate_title] History file not found for {conversation_id} at {history_path}. Cannot generate title.")
        return {"title": f"Chat {conversation_id[:8]}", "detail": "History not found for title generation."}

    try:
        # 1. Load application settings (model, custom prompt, API key for titles)
        app_settings_path = os.path.join("backend", "settings", "app_settings.json")
        current_central_model_for_titles = "anthropic/claude-3.5-haiku" 
        custom_user_prompt_template = None
        user_specific_api_key = None 

        if os.path.exists(app_settings_path):
            try:
                with open(app_settings_path, "r", encoding='utf-8') as f:
                    settings_data = json.load(f)
                raw_central_model = settings_data.get("central_model", "claude-3.5-haiku")
                model_mapping = { 
                    "claude-3.5-haiku": "anthropic/claude-3.5-haiku",
                    "claude-3.7-sonnet": "anthropic/claude-3.7-sonnet"
                }
                current_central_model_for_titles = model_mapping.get(raw_central_model, "anthropic/claude-3.5-haiku")
                custom_user_prompt_template = settings_data.get("title_generation_prompt")
                user_specific_api_key = settings_data.get("api_key") 
                print(f"[endpoint.generate_title] Loaded app settings: model for titles='{current_central_model_for_titles}', custom_prompt exists='{custom_user_prompt_template is not None}', user_api_key exists='{user_specific_api_key is not None}'")
            except Exception as e_settings:
                print(f"[endpoint.generate_title] Error loading app_settings.json: {e_settings}. Using defaults for title generation.")
        else:
            print("[endpoint.generate_title] app_settings.json not found. Using defaults for title generation.")

        final_api_key_for_titles = user_specific_api_key or global_app_config.openrouter_api_key
        if not final_api_key_for_titles:
            print("[endpoint.generate_title] CRITICAL: No API key available for title generation (checked settings & global config).")
            raise HTTPException(status_code=500, detail="API key for title generation is not configured.")

        api_base_for_titles = global_app_config.openrouter_api_base
        if not api_base_for_titles:
            print("[endpoint.generate_title] CRITICAL: OpenRouter API base is not configured in global config.")
            raise HTTPException(status_code=500, detail="OpenRouter API base for title generation is not configured.")

        new_title = await generate_chat_title(
            conversation_id,
            history_path=history_path,
            central_model=current_central_model_for_titles,
            custom_title_prompt_template=custom_user_prompt_template,
            api_key=final_api_key_for_titles,
            api_base=api_base_for_titles
        )
        
        if not new_title or not isinstance(new_title, str) or not new_title.strip() or new_title.startswith("Error Title"):
            print(f"[endpoint.generate_title] Title generation in util returned an invalid/error title: '{new_title}'. Using fallback.")
            new_title = f"Chat {conversation_id[:8]}" 

        print(f"[endpoint.generate_title] Title received from util for {conversation_id}: '{new_title}'")

        config_data = {"id": conversation_id} 
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
            except Exception as e_load_cfg:
                 print(f"[endpoint.generate_title] Error loading existing config {config_path}: {e_load_cfg}. Will create new/overwrite.")
                 config_data = {"id": conversation_id} 
        
        config_data["title"] = new_title.strip()
        config_data["last_title_update"] = time.time()

        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        abs_config_path = os.path.abspath(config_path)
        print(f"[endpoint.generate_title] Attempting to write updated config to: {abs_config_path}")
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=2)
            print(f"[endpoint.generate_title] Successfully saved NEW title to {config_path}")
        except (IOError, OSError) as e_write:
            print(f"[endpoint.generate_title] CRITICAL: FAILED to write to {config_path}. Error: {e_write}")
            return {"title": new_title.strip(), "detail": f"New title generated but failed to save to config file: {str(e_write)}"}
        
        return {"title": new_title.strip()}

    except HTTPException as http_exc:
        print(f"[endpoint.generate_title] HTTPException during title processing for {conversation_id}: {http_exc.detail}")
        raise http_exc 
    except Exception as e:
        print(f"[endpoint.generate_title] Outer error for {conversation_id}: {type(e).__name__} - {e}")
        try:
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f_err:
                    err_cfg_data = json.load(f_err)
                return {"title": err_cfg_data.get("title", f"Chat {conversation_id[:8]}"), "detail": f"Failed to process new title: {str(e)}"}
        except Exception as e_read_final_fallback:
            print(f"[endpoint.generate_title] Could not read config for fallback title for {conversation_id}: {e_read_final_fallback}")
        raise HTTPException(status_code=500, detail=f"Internal error generating/saving title: {str(e)}")

# --- Add logic to run the server if this script is executed directly ---
if __name__ == "__main__":
    uvicorn.run(
        "backend.backend_server:app" if __package__ == "backend" else "backend_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )