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
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain import hub

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
    from backend.tools import ascii_art_generator_tool
except ImportError:
    from config import config as global_app_config # Fallback for global config
    from utils import (
        save_conversation_history,
        load_conversation_history,
        generate_new_conversation_id,
        list_conversations,
        generate_chat_title # The refactored one
    )
    from tools import ascii_art_generator_tool


# --- Memory Cache ---
# Simple in-memory dictionary to store memory objects per conversation
# WARNING: This is basic! Resets on server restart, not suitable for production.
memory_cache: dict[str, ConversationBufferWindowMemory] = {}
# --------------------

# === Conversation-level configuration =========================
# Keep the original valid models as fallbacks, but allow dynamic models from API
FALLBACK_MODELS = {
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

# Function to get valid models (includes both fallback and API models)
def get_valid_models():
    """Get all valid models including those from OpenRouter API"""
    valid_models = set(FALLBACK_MODELS)
    
    # Add models from cache if available
    if models_cache.get("data") and models_cache["data"].get("models"):
        api_models = {model["id"] for model in models_cache["data"]["models"]}
        valid_models.update(api_models)
    
    return valid_models

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

def validate_model(model_name: str | None) -> bool:
    """Validate if a model is supported"""
    if model_name is None:
        return True
    
    valid_models = get_valid_models()
    return model_name in valid_models
# ==============================================================

# Cache for models data to avoid frequent API calls (moved up for use in validation)
models_cache = {
    "data": None,
    "timestamp": 0,
    "cache_duration": 3600  # 1 hour in seconds
}

# Define the structure of the data we expect from the UI
class ChatRequest(BaseModel):
    messages: list[dict]
    conversation_id: str
    model_name: str | None = None
    system_directive: str | None = None
    temperature: float | None = None
    # ASCII tool parameters
    tool_width: int | None = None
    tool_height: int | None = None

    @field_validator("model_name")
    @classmethod
    def check_model(cls, v):
        if v is not None and not validate_model(v):
            # Get current valid models for error message
            valid_models = get_valid_models()
            raise ValueError(f"Unsupported model: {v}. Valid models: {sorted(list(valid_models))}")
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
        if v is not None and not validate_model(v):
            # Get current valid models for error message
            valid_models = get_valid_models()
            raise ValueError(f"Unsupported model: {v}. Valid models: {sorted(list(valid_models))}")
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

def load_app_settings() -> dict:
    """
    Load application-wide settings from app_settings.json
    Returns default settings if file doesn't exist or can't be loaded
    """
    settings_path = os.path.join("backend", "settings", "app_settings.json")
    default_settings = {
        "central_model": "claude-3.5-haiku",
        "api_key": None,
        "title_generation_prompt": None
    }
    
    if not os.path.exists(settings_path):
        return default_settings
    
    try:
        with open(settings_path, "r", encoding='utf-8') as f:
            settings = json.load(f)
            # Ensure we have all required keys with defaults
            return {
                "central_model": settings.get("central_model", default_settings["central_model"]),
                "api_key": settings.get("api_key", default_settings["api_key"]),
                "title_generation_prompt": settings.get("title_generation_prompt", default_settings["title_generation_prompt"])
            }
    except Exception as e:
        print(f"Error loading app settings: {e}. Using defaults.")
        return default_settings

def get_default_model_from_settings() -> str:
    """
    Get the default model name from app settings, mapped to the full model name
    """
    app_settings = load_app_settings()
    central_model = app_settings.get("central_model", "claude-3.5-haiku")
    
    # Map the central model setting to the full model name
    model_mapping = {
        "claude-3.5-haiku": "anthropic/claude-3.5-haiku",
        "claude-3.7-sonnet": "anthropic/claude-3.7-sonnet"
    }
    
    return model_mapping.get(central_model, "anthropic/claude-3.5-haiku")

def load_conversation_config(conversation_id: str) -> dict:
    cfg_path = get_config_path(conversation_id)
    if os.path.exists(cfg_path):
        with open(cfg_path, "r") as f:
            return json.load(f)
    
    # Use app settings for default model instead of hardcoded config
    default_model = get_default_model_from_settings()
    return {
        "model_name": default_model,
        "system_directive": None,
        "temperature": global_app_config.temperature,
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

    # --- 4. Regular chat logic (no tools for this endpoint) ---
    template = """{system_message}

        Previous conversation:
        {chat_history}

        New human input: {human_input}
        Response:"""

    prompt = PromptTemplate(
        input_variables=["system_message", "chat_history", "human_input"],
        template=template
    )

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
    except Exception as e:
        print(f"Error invoking LangChain chain: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {e}")

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
    return ai_response_content  # Return plain text instead of JSON object
    # --- End Return ---

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
        user_specific_api_key = None # We will not use this for titles anymore to ensure .env key is used.

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
                # user_specific_api_key = settings_data.get("api_key") # No longer reading this for titles
                
                # More precise check for API key existence in settings (for logging only, not for use)
                log_user_api_key_in_settings = bool(settings_data.get("api_key")) 

                print(f"[endpoint.generate_title] Loaded app settings: model for titles='{current_central_model_for_titles}', custom_prompt exists='{custom_user_prompt_template is not None}', user_api_key was present in settings file='{log_user_api_key_in_settings}' (but will be IGNORED for title generation).")
            except Exception as e_settings:
                print(f"[endpoint.generate_title] Error loading app_settings.json: {e_settings}. Using defaults for title generation.")
        else:
            print("[endpoint.generate_title] app_settings.json not found. Using defaults for title generation.")

        # ALWAYS use the API key from the global application config (.env via config.py) for title generation
        final_api_key_for_titles = global_app_config.openrouter_api_key
        chosen_key_source = "global_app_config.py (.env)"
            
        print(f"[endpoint.generate_title] API key for title generation will ALWAYS be taken from: {chosen_key_source}")

        if not final_api_key_for_titles:
            print("[endpoint.generate_title] CRITICAL: No API key available for title generation from global_app_config.openrouter_api_key. Ensure it is set in your .env file.")
            raise HTTPException(status_code=500, detail="API key for title generation is not configured in the server environment.")

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

@app.post("/api/ascii/chat")
async def handle_ascii_chat(request: ChatRequest):
    """
    Handles ASCII chat requests and stores them in the asciis folder.
    Uses ASCII art generator tool when appropriate.
    """
    print(f"Received ASCII chat request for conversation_id: {request.conversation_id}")
    conversation_id = request.conversation_id
    incoming_messages = request.messages

    # ---- merge global → stored → request -----------------
    # For ASCII conversations, load config from asciis folder
    ascii_config_path = os.path.join("backend", "asciis", conversation_id, "config.json")
    stored_cfg = {}
    if os.path.exists(ascii_config_path):
        try:
            with open(ascii_config_path, "r") as f:
                stored_cfg = json.load(f)
        except Exception as e:
            print(f"Error loading ASCII config: {e}")
            stored_cfg = {}
    
    # Use defaults if no stored config
    default_model = get_default_model_from_settings()
    stored_cfg.setdefault("model_name", default_model)
    stored_cfg.setdefault("temperature", global_app_config.temperature)
    
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

    # --- 1. Get/Create ASCII Conversation Memory ---
    ascii_memory_key = f"ascii_{conversation_id}"
    if ascii_memory_key not in memory_cache:
        print(f"Creating new memory for ASCII conversation_id: {conversation_id}")
        current_memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            input_key="human_input",
            k=global_app_config.memory_window_size
        )
        memory_cache[ascii_memory_key] = current_memory
        # --- Load from asciis folder if exists ---
        print(f"Attempting to load ASCII history for conversation_id: {conversation_id}")
        loaded = load_conversation_history(current_memory, conversation_id, base_dir="backend/asciis/history")
        if loaded:
            print(f"Successfully loaded ASCII history for {conversation_id} into memory cache.")
        else:
            print(f"No existing ASCII history found for {conversation_id}, or error during load. Starting fresh.")
        # --- End Load ---

    memory = memory_cache[ascii_memory_key]
    # --- End Memory Management ---

    # --- 2. Extract Last User Message ---
    last_user_message_content = ""
    if incoming_messages and incoming_messages[-1].get("role") == "user":
        last_user_message_content = incoming_messages[-1].get("content", "")
    else:
        print("Warning: No user message found at the end of the request payload.")
        raise HTTPException(status_code=400, detail="No user message provided")
    # --- End Extract Message ---

    # --- 3. Instantiate LangChain components ---
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
            # Use ASCII-specific default system message
            system_message = """You are an ASCII art generator. 
When asked to generate ASCII art, use the ascii_art_generator_tool. 
Your response should be ONLY the direct output from the ascii_art_generator_tool. 
Do NOT add any other commentary, explanation, or surrounding text before or after the ASCII art. 
Just output the art. If the user is not asking for ASCII art, you can chat normally."""
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Error setting system message: {e}")

    # --- 4. Check if we should use ASCII art tool ---
    ascii_keywords = ["draw", "create", "generate", "make", "ascii", "art", "picture", "image", "show me"]
    use_ascii_tool = any(keyword in last_user_message_content.lower() for keyword in ascii_keywords)
    
    if use_ascii_tool and (request.tool_width is not None or request.tool_height is not None):
        # Use agent with ASCII art tool
        tools = [ascii_art_generator_tool]
        
        # Get tool dimensions from request or use defaults
        tool_width = request.tool_width or 80
        tool_height = request.tool_height or 24
        
        # Create a custom tool that uses the provided dimensions and model
        def create_ascii_tool_with_dimensions(width: int, height: int, model: str):
            from langchain.tools import tool
            
            @tool
            def ascii_art_with_config(description: str) -> str:
                """Generate ASCII art with the configured dimensions and model."""
                return ascii_art_generator_tool.invoke({
                    "description": description,
                    "width": width,
                    "height": height,
                    "model_name": model
                })
            
            return ascii_art_with_config
        
        # Create tool with user's dimensions and current model
        configured_ascii_tool = create_ascii_tool_with_dimensions(tool_width, tool_height, current_model)
        tools = [configured_ascii_tool]
        
        # Get a prompt for the agent
        try:
            prompt = hub.pull("hwchase17/openai-tools-agent")
        except:
            # Fallback prompt if hub is not available
            from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder(variable_name="agent_scratchpad"),
            ])
        
        # Create agent
        agent = create_openai_tools_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
        
        # Prepare chat history for agent
        chat_history = memory.load_memory_variables({}).get('chat_history', [])
        
        try:
            print(f"Invoking ASCII agent with tools (dimensions: {tool_width}x{tool_height})...")
            result = agent_executor.invoke({
                "input": last_user_message_content,
                "chat_history": chat_history
            })
            ai_response_content = result["output"]
            print(f"ASCII agent response: {ai_response_content}")
        except Exception as e:
            print(f"Error invoking ASCII agent: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing ASCII chat with tools: {e}")
    
    else:
        # Use regular chat logic for non-ASCII requests
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
            print("Invoking ASCII chat chain...")
            ai_response_content = chain.invoke(chain_input_dict)
            print(f"ASCII chat response: {ai_response_content}")
        except Exception as e:
            print(f"Error invoking ASCII chat chain: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing ASCII chat: {e}")

    # --- 5. Update Memory (In-Memory Cache) ---
    memory.save_context(
        {"human_input": last_user_message_content},
        {"output": ai_response_content}
    )
    # --- Save to asciis folder ---
    print(f"Attempting to save ASCII conversation {conversation_id} to disk.")
    save_path = save_conversation_history(memory, conversation_id, base_dir="backend/asciis/history")
    if save_path:
        print(f"ASCII conversation {conversation_id} successfully saved to {save_path}")
    else:
        print(f"Failed to save ASCII conversation {conversation_id} to disk.")
    # --- End Save ---
    # -----------------------------------------
    
    # --- Update the last_message_time in ASCII config ---
    try:
        current_time = time.time()
        # Load existing config
        cfg_dir = os.path.join("backend", "asciis", conversation_id)
        cfg_path = os.path.join(cfg_dir, "config.json")
        
        # Ensure directory exists
        os.makedirs(cfg_dir, exist_ok=True)
        
        # Load existing config or create default
        cfg_data = {
            "id": conversation_id,
            "title": "ASCII Chat",
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
                print(f"Error reading existing ASCII config (will create new): {e}")
        
        # Update timestamp
        cfg_data["last_message_time"] = current_time
        
        # Write back to file
        with open(cfg_path, 'w') as f:
            json.dump(cfg_data, f, indent=2)
            
        print(f"Updated last_message_time for ASCII conversation {conversation_id}")
    except Exception as e:
        print(f"Error updating ASCII last_message_time (non-critical): {e}")
    # --- End update timestamp ---

    # --- 6. Return Response ---
    return ai_response_content  # Return plain text instead of JSON object
    # --- End Return ---

@app.post("/api/ascii/generate")
async def generate_ascii_art(request: dict):
    """
    Generate ASCII art based on a prompt without creating a conversation.
    Stores results in the asciis folder.
    """
    try:
        prompt = request.get("prompt", "")
        # Use central model from app settings as default instead of hardcoded value
        default_model = get_default_model_from_settings()
        model_name = request.get("model_name", default_model)
        system_directive = request.get("system_directive", "You are an ASCII art generator. Generate only ASCII art without additional commentary.")
        temperature = request.get("temperature", 0.7)
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        # Validate model
        if not validate_model(model_name):
            valid_models = get_valid_models()
            raise HTTPException(status_code=400, detail=f"Unsupported model: {model_name}. Valid models: {sorted(list(valid_models))}")
        
        # Clamp temperature
        temperature = max(TEMP_MIN, min(TEMP_MAX, temperature))
        
        # Create LLM instance
        llm = ChatOpenAI(
            model_name=model_name,
            openai_api_key=global_app_config.openrouter_api_key,
            openai_api_base=global_app_config.openrouter_api_base,
            temperature=temperature,
        )
        
        # Create a simple prompt template for ASCII generation
        template = """{system_directive}

{prompt}"""
        
        prompt_template = PromptTemplate(
            input_variables=["system_directive", "prompt"],
            template=template
        )
        
        # Create and run the chain
        chain = prompt_template | llm | StrOutputParser()
        
        result = chain.invoke({
            "system_directive": system_directive,
            "prompt": prompt
        })
        
        # Save the result to asciis folder
        ascii_id = f"ascii-{int(time.time())}-{uuid.uuid4().hex[:8]}"
        ascii_dir = os.path.join("backend", "asciis", ascii_id)
        os.makedirs(ascii_dir, exist_ok=True)
        
        # Save the generation data
        generation_data = {
            "id": ascii_id,
            "prompt": prompt,
            "result": result,
            "model_name": model_name,
            "system_directive": system_directive,
            "temperature": temperature,
            "timestamp": time.time()
        }
        
        with open(os.path.join(ascii_dir, "generation.json"), "w") as f:
            json.dump(generation_data, f, indent=2)
        
        print(f"ASCII art generated and saved to {ascii_dir}")
        
        return {"content": result, "ascii_id": ascii_id}
        
    except Exception as e:
        print(f"Error generating ASCII art: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating ASCII art: {str(e)}")

@app.get("/api/models/list")
async def list_models_with_pricing():
    """
    Fetch available models from OpenRouter with pricing information.
    Returns models with input/output costs per million tokens.
    Uses caching to avoid frequent API calls.
    """
    import time
    
    # Check if we have cached data that's still valid
    current_time = time.time()
    if (models_cache["data"] is not None and 
        current_time - models_cache["timestamp"] < models_cache["cache_duration"]):
        print("Returning cached models data")
        return models_cache["data"]
    
    try:
        # Use the OpenRouter API to fetch models
        headers = {
            "Authorization": f"Bearer {global_app_config.openrouter_api_key}",
            "Content-Type": "application/json",
        }
        
        # Fetch models from OpenRouter
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://openrouter.ai/api/v1/models",
                headers=headers,
                timeout=30.0
            )
            
            if response.status_code != 200:
                print(f"OpenRouter API error: {response.status_code} - {response.text}")
                # If we have cached data, return it even if expired
                if models_cache["data"] is not None:
                    print("API failed, returning stale cached data")
                    return models_cache["data"]
                raise HTTPException(status_code=500, detail="Failed to fetch models from OpenRouter")
            
            models_data = response.json()
            
            # Transform the data to include pricing information
            transformed_models = []
            for model in models_data.get("data", []):
                # Extract pricing information
                pricing = model.get("pricing", {})
                prompt_cost = pricing.get("prompt", "0")
                completion_cost = pricing.get("completion", "0")
                
                # Convert string prices to float (they're usually in format like "0.000001")
                try:
                    prompt_cost_per_million = float(prompt_cost) * 1_000_000 if prompt_cost else 0
                    completion_cost_per_million = float(completion_cost) * 1_000_000 if completion_cost else 0
                except (ValueError, TypeError):
                    prompt_cost_per_million = 0
                    completion_cost_per_million = 0
                
                transformed_model = {
                    "id": model.get("id", ""),
                    "name": model.get("name", model.get("id", "")),
                    "description": model.get("description", ""),
                    "context_length": model.get("context_length", 0),
                    "architecture": model.get("architecture", {}),
                    "pricing": {
                        "prompt": prompt_cost,
                        "completion": completion_cost,
                        "prompt_per_million": round(prompt_cost_per_million, 2),
                        "completion_per_million": round(completion_cost_per_million, 2)
                    },
                    "top_provider": model.get("top_provider", {}),
                    "per_request_limits": model.get("per_request_limits", {})
                }
                transformed_models.append(transformed_model)
            
            # Sort by pricing (cheapest first) and then by name
            transformed_models.sort(key=lambda x: (
                x["pricing"]["prompt_per_million"] + x["pricing"]["completion_per_million"],
                x["name"]
            ))
            
            result = {"models": transformed_models}
            
            # Cache the result
            models_cache["data"] = result
            models_cache["timestamp"] = current_time
            print(f"Cached {len(transformed_models)} models")
            
            return result
            
    except httpx.TimeoutException:
        print("Timeout fetching models from OpenRouter")
        # If we have cached data, return it even if expired
        if models_cache["data"] is not None:
            print("Timeout occurred, returning stale cached data")
            return models_cache["data"]
        raise HTTPException(status_code=504, detail="Timeout fetching models")
    except Exception as e:
        print(f"Error fetching models: {e}")
        # If we have cached data, return it even if expired
        if models_cache["data"] is not None:
            print("Error occurred, returning stale cached data")
            return models_cache["data"]
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")

@app.post("/api/models/refresh")
async def refresh_models_cache():
    """
    Clear the models cache to force a fresh fetch from OpenRouter.
    Useful for debugging or when you want updated pricing.
    """
    global models_cache
    models_cache["data"] = None
    models_cache["timestamp"] = 0
    print("Models cache cleared")
    return {"message": "Models cache cleared successfully"}

@app.get("/api/ascii-conversations/list")
async def list_ascii_conversations():
    """
    List all ASCII conversations stored in the asciis folder.
    Only includes directories with config.json files (actual conversations).
    """
    try:
        ascii_conversations = []
        asciis_dir = os.path.join("backend", "asciis")
        
        if not os.path.exists(asciis_dir):
            return []
        
        for item in os.listdir(asciis_dir):
            item_path = os.path.join(asciis_dir, item)
            config_path = os.path.join(item_path, "config.json")
            
            # Only include directories that have a config.json file (actual conversations)
            if os.path.isdir(item_path) and os.path.exists(config_path):
                conversation_data = {
                    "id": item,
                    "title": f"ASCII Chat {item[-8:]}",  # Use last 8 chars as title
                    "last_message_time": None
                }
                
                # Load config for details
                try:
                    with open(config_path, "r") as f:
                        config = json.load(f)
                        conversation_data["title"] = config.get("title", conversation_data["title"])
                        conversation_data["last_message_time"] = config.get("last_message_time")
                except Exception as e:
                    print(f"Error reading ASCII conversation config {config_path}: {e}")
                
                ascii_conversations.append(conversation_data)
        
        # Sort by last message time (newest first), handle None values properly
        ascii_conversations.sort(key=lambda x: x.get("last_message_time") or 0, reverse=True)
        
        return ascii_conversations
        
    except Exception as e:
        print(f"Error listing ASCII conversations: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing ASCII conversations: {str(e)}")

@app.post("/api/ascii-conversations/create")
async def create_ascii_conversation():
    """
    Create a new ASCII conversation in the asciis folder.
    """
    try:
        conversation_id = f"ascii-default-{int(time.time())}"
        conversation_dir = os.path.join("backend", "asciis", conversation_id)
        os.makedirs(conversation_dir, exist_ok=True)
        
        # Create initial config
        config_data = {
            "id": conversation_id,
            "title": "ASCII Chat",
            "created_time": time.time(),
            "last_message_time": time.time()
        }
        
        config_path = os.path.join(conversation_dir, "config.json")
        with open(config_path, "w") as f:
            json.dump(config_data, f, indent=2)
        
        print(f"Created ASCII conversation: {conversation_id}")
        
        return {"conversation_id": conversation_id}
        
    except Exception as e:
        print(f"Error creating ASCII conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating ASCII conversation: {str(e)}")

@app.get("/api/ascii-conversations/{conversation_id}/messages")
async def get_ascii_conversation_messages(conversation_id: str):
    """
    Get messages for an ASCII conversation from the asciis folder.
    """
    try:
        # Look for history in asciis/history folder
        history_file = os.path.join("backend", "asciis", "history", f"{conversation_id}.json")
        
        if not os.path.exists(history_file):
            return {"conversation_id": conversation_id, "messages": []}
        
        # Create temporary memory to load the conversation
        temp_memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            input_key="human_input",
            k=global_app_config.memory_window_size
        )
        
        # Load from the asciis history folder
        loaded = load_conversation_history(temp_memory, conversation_id, base_dir="backend/asciis/history")
        if not loaded:
            return {"conversation_id": conversation_id, "messages": []}
        
        # Extract messages from memory
        messages = []
        if hasattr(temp_memory, 'chat_memory') and hasattr(temp_memory.chat_memory, 'messages'):
            for msg in temp_memory.chat_memory.messages:
                if isinstance(msg, HumanMessage):
                    messages.append({"role": "user", "content": msg.content})
                elif isinstance(msg, AIMessage):
                    messages.append({"role": "assistant", "content": msg.content})
        
        return {"conversation_id": conversation_id, "messages": messages}
        
    except Exception as e:
        print(f"Error getting ASCII conversation messages: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting ASCII conversation messages: {str(e)}")

@app.delete("/api/ascii-conversations/{conversation_id}")
async def delete_ascii_conversation(conversation_id: str):
    """
    Delete an ASCII conversation from the asciis folder.
    """
    try:
        # Delete conversation directory
        conversation_dir = os.path.join("backend", "asciis", conversation_id)
        if os.path.exists(conversation_dir):
            shutil.rmtree(conversation_dir)
            print(f"Deleted ASCII conversation directory: {conversation_dir}")
        
        # Delete history file
        history_file = os.path.join("backend", "asciis", "history", f"{conversation_id}.json")
        if os.path.exists(history_file):
            os.remove(history_file)
            print(f"Deleted ASCII conversation history: {history_file}")
        
        return {"success": True, "message": f"ASCII conversation {conversation_id} deleted successfully"}
        
    except Exception as e:
        print(f"Error deleting ASCII conversation: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting ASCII conversation: {str(e)}")

@app.post("/api/ascii-conversations/{conversation_id}/generate-title")
async def generate_ascii_conversation_title_endpoint(conversation_id: str):
    """
    Generates a NEW title for an ASCII conversation based on its history using current app settings,
    and saves it to config.json in the asciis folder.
    """
    print(f"[endpoint.generate_ascii_title] Request for NEW title for ASCII conversation {conversation_id}")

    # Path for ASCII history structure
    history_base_dir = os.path.join("backend", "asciis", "history") 
    history_path = os.path.join(history_base_dir, f"{conversation_id}.json")
    
    # Config path for ASCII conversations
    config_path = os.path.join("backend", "asciis", conversation_id, "config.json")

    if not os.path.exists(history_path):
        print(f"[endpoint.generate_ascii_title] History file not found for {conversation_id} at {history_path}. Cannot generate title.")
        return {"title": f"ASCII Chat {conversation_id[:8]}", "detail": "History not found for title generation."}

    try:
        # 1. Load application settings (model, custom prompt, API key for titles)
        app_settings_path = os.path.join("backend", "settings", "app_settings.json")
        current_central_model_for_titles = "anthropic/claude-3.5-haiku" 
        custom_user_prompt_template = None

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
                
                print(f"[endpoint.generate_ascii_title] Loaded app settings: model for titles='{current_central_model_for_titles}', custom_prompt exists='{custom_user_prompt_template is not None}'.")
            except Exception as e_settings:
                print(f"[endpoint.generate_ascii_title] Error loading app_settings.json: {e_settings}. Using defaults for title generation.")
        else:
            print("[endpoint.generate_ascii_title] app_settings.json not found. Using defaults for title generation.")

        # Use the API key from the global application config (.env via config.py) for title generation
        final_api_key_for_titles = global_app_config.openrouter_api_key
        chosen_key_source = "global_app_config.py (.env)"
            
        print(f"[endpoint.generate_ascii_title] API key for title generation will be taken from: {chosen_key_source}")

        if not final_api_key_for_titles:
            print("[endpoint.generate_ascii_title] CRITICAL: No API key available for title generation from global_app_config.openrouter_api_key. Ensure it is set in your .env file.")
            raise HTTPException(status_code=500, detail="API key for title generation is not configured in the server environment.")

        api_base_for_titles = global_app_config.openrouter_api_base
        if not api_base_for_titles:
            print("[endpoint.generate_ascii_title] CRITICAL: OpenRouter API base is not configured in global config.")
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
            print(f"[endpoint.generate_ascii_title] Title generation in util returned an invalid/error title: '{new_title}'. Using fallback.")
            new_title = f"ASCII Chat {conversation_id[:8]}" 

        print(f"[endpoint.generate_ascii_title] Title received from util for {conversation_id}: '{new_title}'")

        config_data = {"id": conversation_id, "title": "ASCII Chat"} 
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    config_data = json.load(f)
            except Exception as e_load_cfg:
                 print(f"[endpoint.generate_ascii_title] Error loading existing config {config_path}: {e_load_cfg}. Will create new/overwrite.")
                 config_data = {"id": conversation_id, "title": "ASCII Chat"} 
        
        config_data["title"] = new_title.strip()
        config_data["last_title_update"] = time.time()

        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        abs_config_path = os.path.abspath(config_path)
        print(f"[endpoint.generate_ascii_title] Attempting to write updated config to: {abs_config_path}")
        try:
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config_data, f, indent=2)
            print(f"[endpoint.generate_ascii_title] Successfully saved NEW title to {config_path}")
        except (IOError, OSError) as e_write:
            print(f"[endpoint.generate_ascii_title] CRITICAL: FAILED to write to {config_path}. Error: {e_write}")
            return {"title": new_title.strip(), "detail": f"New title generated but failed to save to config file: {str(e_write)}"}
        
        return {"title": new_title.strip()}

    except HTTPException as http_exc:
        print(f"[endpoint.generate_ascii_title] HTTPException during title processing for {conversation_id}: {http_exc.detail}")
        raise http_exc 
    except Exception as e:
        print(f"[endpoint.generate_ascii_title] Outer error for {conversation_id}: {type(e).__name__} - {e}")
        try:
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f_err:
                    err_cfg_data = json.load(f_err)
                return {"title": err_cfg_data.get("title", f"ASCII Chat {conversation_id[:8]}"), "detail": f"Failed to process new title: {str(e)}"}
        except Exception as e_read_final_fallback:
            print(f"[endpoint.generate_ascii_title] Could not read config for fallback title for {conversation_id}: {e_read_final_fallback}")
        raise HTTPException(status_code=500, detail=f"Internal error generating/saving ASCII title: {str(e)}")

# --- Add logic to run the server if this script is executed directly ---
if __name__ == "__main__":
    uvicorn.run(
        "backend.backend_server:app" if __package__ == "backend" else "backend_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )