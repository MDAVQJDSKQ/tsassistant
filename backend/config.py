import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Load environment variables from .env file FIRST
# This ensures they are available when ChatbotConfig is instantiated
load_dotenv()

# --- Configuration Class using Pydantic ---
class ChatbotConfig(BaseSettings):
    # Define your configuration variables with type hints
    # Pydantic will automatically look for environment variables with these names (case-insensitive)
    openrouter_api_key: str
    openrouter_api_base: str = "https://openrouter.ai/api/v1" # Default value
    model_name: str = "anthropic/claude-3.5-haiku"
    temperature: float = 0.7
    memory_window_size: int = 10 # Example for memory 'k'

    # Optional: Configure Pydantic settings (e.g., .env file path)
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

# Instantiate the config class - this loads the variables
# Make it a single instance to be imported elsewhere
try:
    config = ChatbotConfig()
except Exception as e: # Catch potential validation errors
    print(f"Error loading configuration: {e}")
    # Handle error appropriately, maybe exit
    exit()
# --- End Configuration ---