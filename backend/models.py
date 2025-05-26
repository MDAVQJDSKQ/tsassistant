from pydantic import BaseModel, field_validator
from typing import List, Dict, Any

# === Constants ===
FALLBACK_MODELS = {
    "anthropic/claude-opus-4",
    "anthropic/claude-sonnet-4",
    "anthropic/claude-3.5-haiku",
    "openai/gpt-4.1",
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1-nano",
    "x-ai/grok-3-mini-beta",
    "x-ai/grok-3-beta",
    "google/gemini-2.5-pro-preview"
    "google/gemini-2.5-flash-preview-05-20",
    "google/gemma-3-12b-it:free",
    
}

DEFAULT_SYSTEM_PATHS = [
    "backend/prompts/system_prompt.txt",
    "prompts/system_prompt.txt",
]

TEMP_MIN, TEMP_MAX = 0.0, 2.0
CONVERSATIONS_DIR = "backend/conversations"

# === Helper Functions ===
def get_valid_models():
    """Get all valid models including those from OpenRouter API"""
    # Import here to avoid circular imports
    try:
        from backend.services import models_cache
    except ImportError:
        # Fallback if services not available yet
        models_cache = {"data": None}
    
    valid_models = set(FALLBACK_MODELS)
    
    # Add models from cache if available
    if models_cache.get("data") and models_cache["data"].get("models"):
        api_models = {model["id"] for model in models_cache["data"]["models"]}
        valid_models.update(api_models)
    
    return valid_models

def validate_model(model_name: str | None) -> bool:
    """Validate if a model is supported"""
    if model_name is None:
        return True
    
    valid_models = get_valid_models()
    return model_name in valid_models

def _clamp_temperature(t: float | None) -> float:
    """Clamp temperature to valid range"""
    if t is None:
        try:
            from backend.config import config
            return config.temperature
        except ImportError:
            from config import config
            return config.temperature
    return max(TEMP_MIN, min(TEMP_MAX, t))

# === Pydantic Models ===
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