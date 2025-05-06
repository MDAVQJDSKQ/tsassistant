import os
import json
from typing import List, Dict
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage

# --- Persistence Functions ---
def save_conversation_history(
    memory: ConversationBufferWindowMemory,
    base_dir: str = "backend/convos"
) -> str:
    """
    Save conversation history to a numbered JSON file in the specified directory.

    Args:
        memory: LangChain ConversationBufferWindowMemory object
        base_dir: Directory to save conversation files

    Returns:
        Path of the saved conversation file or None if error
    """
    os.makedirs(base_dir, exist_ok=True)
    # Use .json extension
    existing_files = [f for f in os.listdir(base_dir) if f.startswith("conversation_") and f.endswith(".json")]

    try:
        if existing_files:
            numbers = [int(f.split("_")[1].split(".")[0]) for f in existing_files]
            next_number = max(numbers) + 1
        else:
            next_number = 1

        # Access the messages directly from the memory's chat_memory
        history = memory.chat_memory.messages
        serializable_history = [
            {
                "type": "human" if isinstance(msg, HumanMessage) else
                        "ai" if isinstance(msg, AIMessage) else
                        msg.__class__.__name__, # Keep original class name
                "content": msg.content
            } for msg in history
        ]

        filename = f"conversation_{next_number}.json" # Use .json
        filepath = os.path.join(base_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(serializable_history, f, indent=2, ensure_ascii=False)

        print(f"Conversation saved to {filepath}")
        return filepath
    except Exception as e:
        print(f"Error saving conversation: {e}")
        return None # Return None on error

def load_latest_conversation_history(
    memory: ConversationBufferWindowMemory,
    base_dir: str = "backend/convos"
) -> bool:
    """
    Load the most recent conversation history from the specified directory
    directly into the memory object.

    Args:
        memory: LangChain ConversationBufferWindowMemory object to populate
        base_dir: Directory containing conversation files

    Returns:
        True if history was loaded successfully, False otherwise.
    """
    os.makedirs(base_dir, exist_ok=True)
    # Use .json extension
    existing_files = [f for f in os.listdir(base_dir) if f.startswith("conversation_") and f.endswith(".json")]

    if not existing_files:
        print("No saved conversations found.")
        return False

    try:
        latest_file = max(existing_files, key=lambda f: int(f.split("_")[1].split(".")[0]))
        filepath = os.path.join(base_dir, latest_file)

        with open(filepath, 'r', encoding='utf-8') as f:
            loaded_history = json.load(f)

        reconstructed_messages: List[BaseMessage] = []
        for msg_data in loaded_history:
            msg_type = msg_data.get("type")
            content = msg_data.get("content")
            if msg_type == 'human':
                reconstructed_messages.append(HumanMessage(content=content))
            elif msg_type == 'ai':
                reconstructed_messages.append(AIMessage(content=content))
            else:
                print(f"Warning: Skipping message of unknown type '{msg_type}' during load.")


        # --- Correct way to load into memory ---
        memory.chat_memory.clear() # Clear existing messages
        memory.chat_memory.messages = reconstructed_messages # Directly assign loaded messages
        # --- End Correction ---


        print(f"Conversation loaded from {latest_file}")
        return True

    except FileNotFoundError:
        print(f"Error: Latest conversation file not found at {filepath}")
        return False
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {filepath}. File might be corrupted.")
        return False
    except Exception as e:
        print(f"Error loading conversation: {e}")
        return False
# --- End Persistence Functions ---