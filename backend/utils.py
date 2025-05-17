import os
import json
import uuid # Add this import
import time
from typing import List, Dict, Optional
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage

# --- Persistence Functions ---
def save_conversation_history(
    memory: ConversationBufferWindowMemory,
    conversation_id: str, # Added conversation_id
    base_dir: str = "backend/conversations/history"
) -> str:
    """
    Save conversation history to a JSON file named with the conversation_id.

    Args:
        memory: LangChain ConversationBufferWindowMemory object
        conversation_id: Unique identifier for the conversation
        base_dir: Directory to save conversation files

    Returns:
        Path of the saved conversation file or None if error
    """
    os.makedirs(base_dir, exist_ok=True)
    
    try:
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

        filename = f"{conversation_id}.json" # Use conversation_id for filename
        filepath = os.path.join(base_dir, filename)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(serializable_history, f, indent=2, ensure_ascii=False)

        print(f"Conversation saved to {filepath}")
        return filepath
    except Exception as e:
        print(f"Error saving conversation {conversation_id}: {e}")
        return None # Return None on error

def load_conversation_history( # Renamed and signature changed
    memory: ConversationBufferWindowMemory,
    conversation_id: str, # Added conversation_id
    base_dir: str = "backend/conversations/history"
) -> bool:
    """
    Load conversation history for a specific conversation_id
    directly into the memory object.

    Args:
        memory: LangChain ConversationBufferWindowMemory object to populate
        conversation_id: Unique identifier for the conversation to load
        base_dir: Directory containing conversation files

    Returns:
        True if history was loaded successfully, False otherwise.
    """
    os.makedirs(base_dir, exist_ok=True)
    filepath = os.path.join(base_dir, f"{conversation_id}.json") # Use conversation_id

    try:
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
                print(f"Warning: Skipping message of unknown type '{msg_type}' during load for {conversation_id}.")


        # --- Correct way to load into memory ---
        memory.chat_memory.clear() # Clear existing messages
        memory.chat_memory.messages = reconstructed_messages # Directly assign loaded messages
        # --- End Correction ---


        print(f"Conversation {conversation_id} loaded from {filepath}")
        return True

    except FileNotFoundError:
        print(f"No history found for conversation_id '{conversation_id}' at {filepath}. Starting fresh.")
        return False # Important for new conversations
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {filepath} for {conversation_id}. File might be corrupted.")
        return False
    except Exception as e:
        print(f"Error loading conversation {conversation_id}: {e}")
        return False

def load_latest_conversation_history(
    memory: ConversationBufferWindowMemory,
    base_dir: str = "backend/conversations/history"
) -> bool:
    """
    Load the most recently modified conversation history into memory.
    If no valid conversation files exist, returns False.

    Args:
        memory: LangChain ConversationBufferWindowMemory object to populate
        base_dir: Directory containing conversation files

    Returns:
        True if history was loaded successfully, False otherwise.
    """
    os.makedirs(base_dir, exist_ok=True)
    
    try:
        # List all valid conversation files with UUID filenames
        conversations = list_conversations(base_dir)
        if not conversations:
            print("No valid conversation files found.")
            return False
            
        # Find the most recently modified file
        latest_time = 0
        latest_id = None
        
        for convo in conversations:
            filepath = os.path.join(base_dir, f"{convo['id']}.json")
            mod_time = os.path.getmtime(filepath)
            if mod_time > latest_time:
                latest_time = mod_time
                latest_id = convo['id']
                
        if latest_id:
            # Load the conversation using the existing function
            return load_conversation_history(memory, latest_id, base_dir)
            
        return False
    except Exception as e:
        print(f"Error loading latest conversation: {e}")
        return False

def generate_new_conversation_id() -> str:
    """Generates a new unique conversation ID using UUID4."""
    return str(uuid.uuid4())

def list_conversations(base_dir: str = "backend/conversations/history") -> List[Dict[str, str]]:
    """
    Lists all saved conversation files (UUIDs) and provides a short name.
    Returns a list of dictionaries, e.g., [{"id": "uuid-string", "name": "uuid-st..."}].
    """
    os.makedirs(base_dir, exist_ok=True)
    conversation_files = [f for f in os.listdir(base_dir) if f.endswith(".json")]
    conversations = []
    for f_name in conversation_files:
        convo_id = f_name.replace(".json", "")
        try:
            uuid.UUID(convo_id) # Validate if it's a UUID
            # You could add more metadata here, e.g., last modified time
            # last_modified = os.path.getmtime(os.path.join(base_dir, f_name))
            conversations.append({
                "id": convo_id,
                "name": convo_id[:8] # Use first 8 chars of UUID as a display name
                # "last_modified": last_modified # Example
            })
        except ValueError:
            print(f"Skipping non-UUID filename in convos directory: {f_name}")
    # Optionally sort conversations, e.g., by last modified time if added
    return conversations
# --- End Persistence Functions ---