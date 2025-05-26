# Run the backend server using: python -m backend.backend_server

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import List

# Import our models and services
from .models import (
    ChatRequest, ConversationConfig, SettingsModel, 
    ConversationListItem, NewConversationResponse
)
from .services import (
    ChatService, ConversationService, SettingsService, 
    ModelService, ASCIIService
)

# Instantiate the FastAPI app
app = FastAPI()

# --- Configure CORS ---
origins = [
    "http://localhost",  # Base domain for localhost
    "http://localhost:3000",  # Common React dev port - ADJUST IF YOURS IS DIFFERENT
    # Add any other origins you might need (e.g., your deployed frontend URL)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # List of origins allowed
    allow_credentials=True,  # Allow cookies (if needed later)
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# === Chat Routes ===
@app.post("/api/chat")
async def handle_chat(request: ChatRequest):
    """Handles chat requests from the frontend."""
    return await ChatService.handle_chat(request)

@app.post("/api/ascii/chat")
async def handle_ascii_chat(request: ChatRequest):
    """Handles ASCII chat requests and stores them in the asciis folder."""
    return await ChatService.handle_ascii_chat(request)

@app.post("/api/ascii/generate")
async def generate_ascii_art(request: dict):
    """Generate ASCII art based on a prompt without creating a conversation."""
    return await ASCIIService.generate_ascii_art(request)

# === Conversation Routes ===
@app.get("/api/conversations", response_model=List[ConversationListItem])
async def get_conversations_list_endpoint():
    """Get list of all conversations."""
    return ConversationService.list_conversations()

@app.post("/api/conversations/new", response_model=NewConversationResponse)
async def create_new_conversation_endpoint():
    """Create a new conversation."""
    return ConversationService.create_conversation()

@app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages_endpoint(conversation_id: str):
    """Retrieves the messages for a specific conversation ID."""
    return ConversationService.get_conversation_messages(conversation_id)

@app.post("/api/conversations/config")
async def save_conversation_config(cfg: ConversationConfig):
    """Save conversation configuration."""
    return ConversationService.save_conversation_config(cfg)

@app.get("/api/conversations/{conversation_id}/config")
async def get_conversation_config(conversation_id: str):
    """Get conversation configuration."""
    return ConversationService.get_conversation_config(conversation_id)

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation_endpoint(conversation_id: str):
    """Delete a conversation and all its data."""
    return ConversationService.delete_conversation(conversation_id)

@app.post("/api/conversations/{conversation_id}/generate-title")
async def generate_conversation_title_endpoint(conversation_id: str):
    """Generates a NEW title for a conversation based on its history."""
    return await ConversationService.generate_conversation_title(conversation_id)

# === ASCII Conversation Routes ===
@app.get("/api/ascii-conversations/list")
async def list_ascii_conversations():
    """List all ASCII conversations stored in the asciis folder."""
    return ASCIIService.list_ascii_conversations()

@app.post("/api/ascii-conversations/create")
async def create_ascii_conversation():
    """Create a new ASCII conversation in the asciis folder."""
    return ASCIIService.create_ascii_conversation()

@app.get("/api/ascii-conversations/{conversation_id}/messages")
async def get_ascii_conversation_messages(conversation_id: str):
    """Get messages for an ASCII conversation from the asciis folder."""
    return ASCIIService.get_ascii_conversation_messages(conversation_id)

@app.delete("/api/ascii-conversations/{conversation_id}")
async def delete_ascii_conversation(conversation_id: str):
    """Delete an ASCII conversation from the asciis folder."""
    return ASCIIService.delete_ascii_conversation(conversation_id)

@app.post("/api/ascii-conversations/{conversation_id}/generate-title")
async def generate_ascii_conversation_title_endpoint(conversation_id: str):
    """Generates a NEW title for an ASCII conversation based on its history."""
    return await ASCIIService.generate_ascii_conversation_title(conversation_id)

# === Settings Routes ===
@app.post("/settings")
async def update_settings(settings: SettingsModel):
    """Update application-wide settings."""
    return SettingsService.update_settings(settings)

@app.get("/settings")
async def get_settings():
    """Get current application-wide settings."""
    return SettingsService.get_settings()

# === Model Routes ===
@app.get("/api/models/list")
async def list_models_with_pricing():
    """Fetch available models from OpenRouter with pricing information."""
    return await ModelService.list_models_with_pricing()

@app.post("/api/models/refresh")
async def refresh_models_cache():
    """Clear the models cache to force a fresh fetch from OpenRouter."""
    return ModelService.refresh_models_cache()

@app.get("/api/models/fallback-list")
async def get_fallback_models_endpoint():
    """Get the list of fallback models."""
    return ModelService.get_fallback_models()

# === Server Startup ===
if __name__ == "__main__":
    uvicorn.run(
        "backend.backend_server:app" if __package__ == "backend" else "backend_server:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )