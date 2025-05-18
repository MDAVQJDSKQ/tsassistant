import os
import json
import uuid # Add this import
import time
from typing import List, Dict, Optional
from langchain.memory import ConversationBufferWindowMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI

# --- Persistence Functions ---
def save_conversation_history(
    memory: ConversationBufferWindowMemory,
    conversation_id: str, 
    base_dir: str = "backend/conversations/history" # Reverted to original base_dir default
) -> Optional[str]: 
    """
    Save conversation history to a JSON file named with the conversation_id.
    Saves to: backend/conversations/history/<conversation_id>.json
    """
    os.makedirs(base_dir, exist_ok=True) # Ensure the base_dir itself exists
    
    try:
        history = memory.chat_memory.messages
        serializable_history = [
            {
                "type": "human" if isinstance(msg, HumanMessage) else
                        "ai" if isinstance(msg, AIMessage) else
                        msg.__class__.__name__,
                "content": msg.content
            } for msg in history
        ]

        filename = f"{conversation_id}.json"
        filepath = os.path.join(base_dir, filename) # Save directly into base_dir

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(serializable_history, f, indent=2, ensure_ascii=False)

        print(f"Conversation saved to {filepath}")
        return filepath
    except Exception as e:
        print(f"Error saving conversation {conversation_id} to {base_dir}: {e}")
        return None

def load_conversation_history(
    memory: ConversationBufferWindowMemory,
    conversation_id: str, 
    base_dir: str = "backend/conversations/history" # Reverted to original base_dir default
) -> bool:
    """
    Load conversation history for a specific conversation_id from:
    backend/conversations/history/<conversation_id>.json
    """
    os.makedirs(base_dir, exist_ok=True) # Ensure base_dir exists
    filepath = os.path.join(base_dir, f"{conversation_id}.json")

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

async def generate_chat_title(
    conversation_id: str, 
    history_path: str, # Expect history_path to be valid
    central_model: str, # Expect the specific model string, e.g., "anthropic/claude-3.5-haiku"
    custom_title_prompt_template: Optional[str], # The user's custom prompt template
    api_key: str, # Expect API key to be passed
    api_base: str # Expect API base to be passed
) -> Optional[str]:
    """
    Generates a new title for a chat conversation using the provided model, history, and prompt.
    This function ALWAYS attempts to generate a new title.
    """
    print(f"[utils.generate_chat_title] Attempting to generate NEW title for {conversation_id} using model {central_model}")
    # Log the API key and base URL details (partially)
    api_key_display = f"{api_key[:5]}...{api_key[-4:]}" if api_key and len(api_key) > 9 else "API key too short or not set"
    print(f"[utils.generate_chat_title] Using API Key (partial): {api_key_display}, API Base: {api_base}")

    try:
        messages_for_title = []
        if os.path.exists(history_path):
            try:
                with open(history_path, 'r', encoding='utf-8') as f:
                    history_data = json.load(f)
                # Extract a few messages for context (e.g., first 4)
                for msg_data in history_data[:4]: 
                    role = "user" if msg_data.get("type") == "human" else "assistant" if msg_data.get("type") == "ai" else None
                    if role and msg_data.get("content"):
                        messages_for_title.append({"role": role, "content": msg_data.get("content")})
            except Exception as e_hist:
                print(f"[utils.generate_chat_title] Error reading history from {history_path} for {conversation_id}: {e_hist}")
                # Proceed without history if loading fails, LLM might generate a generic title
        
        if not messages_for_title:
            print(f"[utils.generate_chat_title] No message context from history for {conversation_id}. LLM will generate title without it.")
            # Allow generation to proceed, might result in a very generic title or based on prompt alone

        llm = ChatOpenAI(
            model_name=central_model, # Use the model passed from settings
            openai_api_key=api_key,
            openai_api_base=api_base,
            temperature=0.5, # Use a moderate temperature for title generation
            max_tokens=50    # Limit tokens for a title
        )
        
        # Construct prompt
        prompt_template_to_use = custom_title_prompt_template if custom_title_prompt_template and custom_title_prompt_template.strip() else "Generate a concise and relevant title (3-7 words) for the following conversation. Return only the title itself, with no extra formatting, labels, or quotation marks:"
        
        # Format messages for the prompt. Concatenate them.
        conversation_summary_for_prompt = "\\n".join([f"{m['role']}: {m['content'][:150]}" for m in messages_for_title]) # Max 150 chars per message summary
        
        final_prompt_for_llm = f"{prompt_template_to_use}\\n\\nConversation Excerpt:\\n{conversation_summary_for_prompt}"
        
        print(f"[utils.generate_chat_title] Generating title for {conversation_id} with prompt (first 200 chars): '{final_prompt_for_llm[:200]}...'")

        # Use ainvoke for async operation if ChatOpenAI supports it well, or invoke if sync is fine for this util
        title_response = await llm.ainvoke(final_prompt_for_llm) 
        
        generated_title = ""
        if hasattr(title_response, 'content'):
            generated_title = title_response.content.strip().replace('"', '').replace("'", "")
        elif isinstance(title_response, str):
            generated_title = title_response.strip().replace('"', '').replace("'", "")

        if not generated_title:
            print(f"[utils.generate_chat_title] LLM returned empty title for {conversation_id}. Defaulting.")
            return f"Chat {conversation_id[:8]}" # Fallback
        
        # Basic cleanup: remove potential "Title:" prefixes if LLM adds them
        if generated_title.lower().startswith("title:"):
            generated_title = generated_title[len("title:"):].strip()
        
        # Max title length
        if len(generated_title) > 60: 
            generated_title = generated_title[:57] + "..."
        
        print(f"[utils.generate_chat_title] LLM generated new title for {conversation_id}: '{generated_title}'")
        return generated_title
    
    except Exception as e:
        print(f"[utils.generate_chat_title] CRITICAL error during new title generation for {conversation_id}: {type(e).__name__} - {e}")
        # Fallback to a generic title in case of any error during the generation process
        return f"Error Title {conversation_id[:4]}" 

def generate_new_conversation_id() -> str:
    """Generate a new unique conversation ID using UUID"""
    return str(uuid.uuid4())

def list_conversations(base_dir: str = "backend/conversations/history") -> List[Dict[str, str]]:
    """
    Lists all saved conversation files (UUIDs) and provides a short name.
    Returns a list of dictionaries, e.g., [{"id": "uuid-string", "name": "uuid-st...", "title": "Conversation Title"}].
    """
    try:
        os.makedirs(base_dir, exist_ok=True)
        conversation_files = [f for f in os.listdir(base_dir) if f.endswith(".json")]
        conversations = []
        
        for f_name in conversation_files:
            try:
                convo_id = f_name.replace(".json", "")
                # Validate if it's a UUID
                try:
                    uuid.UUID(convo_id)
                except ValueError:
                    print(f"Skipping non-UUID filename in convos directory: {f_name}")
                    continue
                
                # Initialize conversation info with defaults
                conversation_info = {
                    "id": convo_id,
                    "name": convo_id[:8] # Use first 8 chars of UUID as a display name
                }
                
                # Try to get title and last_message_time from config
                try:
                    # Check if config exists and read its data
                    config_path = os.path.join("backend", "conversations", convo_id, "config.json")
                    if os.path.exists(config_path):
                        with open(config_path, 'r') as f:
                            config_data = json.load(f)
                            # Get title if available
                            if "title" in config_data:
                                conversation_info["title"] = config_data["title"]
                            
                            # Get last_message_time if available
                            last_message_time = config_data.get("last_message_time")
                            if last_message_time is not None:
                                conversation_info["last_message_time"] = last_message_time
                except Exception as e:
                    print(f"Error reading config for {convo_id}: {e}")
                
                # If we couldn't get last_message_time from config, use file modification time
                if "last_message_time" not in conversation_info:
                    history_path = os.path.join(base_dir, f_name)
                    if os.path.exists(history_path):
                        conversation_info["last_message_time"] = os.path.getmtime(history_path)
                
                conversations.append(conversation_info)
            except Exception as e:
                print(f"Error processing conversation file {f_name}: {e}")
                # Continue with next file
                continue
        
        # Sort conversations by last_message_time if available, newest first
        conversations.sort(
            key=lambda x: x.get("last_message_time", 0),
            reverse=True
        )
        
        return conversations
    except Exception as e:
        print(f"Error listing conversations: {e}")
        return []  # Return empty list on error
# --- End Persistence Functions ---