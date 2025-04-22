import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict # Import BaseSettings
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain # Replaced by LCEL
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser
import json
from typing import List, Dict
from langchain.schema import BaseMessage, HumanMessage, AIMessage

# Load environment variables from .env file FIRST
load_dotenv()

# --- Configuration Class using Pydantic ---
class ChatbotConfig(BaseSettings):
    # Define your configuration variables with type hints
    # Pydantic will automatically look for environment variables with these names (case-insensitive)
    openrouter_api_key: str
    openrouter_api_base: str = "https://openrouter.ai/api/v1" # Default value
    model_name: str = "anthropic/claude-3.5-haiku" # Default value
    temperature: float = 0.7
    memory_window_size: int = 10 # Example for memory 'k'

    # Optional: Configure Pydantic settings (e.g., .env file path)
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

# Instantiate the config class - this loads the variables
try:
    config = ChatbotConfig()
except Exception as e: # Catch potential validation errors
    print(f"Error loading configuration: {e}")
    # Handle error appropriately, maybe exit
    exit()
# --- End Configuration ---


# --- Persistence Functions ---
def save_conversation_history(
    memory: ConversationBufferWindowMemory,
    base_dir: str = "convos"
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
    base_dir: str = "convos"
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

def main():
    """Runs the minimal chatbot application."""

    # Use config attributes instead of os.getenv
    if not config.openrouter_api_key or config.openrouter_api_key == "YOUR_API_KEY_HERE":
        print("Error: OPENROUTER_API_KEY not found or not set.")
        print("Please add your key to the .env file or set the environment variable.")
        return

    # 1. Instantiate the LLM using config
    llm = ChatOpenAI(
        model_name=config.model_name,
        openai_api_key=config.openrouter_api_key,
        openai_api_base=config.openrouter_api_base,
        # Optional: Add headers if needed by OpenRouter, though often not required
        # headers={"HTTP-Referer": $YOUR_SITE_URL, "X-Title": $YOUR_SITE_NAME}
        temperature=config.temperature, # Adjust creativity/randomness
    )

    # 2. Instantiate Memory using config
    # memory_key must match the input variable in the prompt template
    memory = ConversationBufferWindowMemory(
        memory_key="chat_history",
        return_messages=True,
        input_key="human_input",
        k=config.memory_window_size  # Use config value
    )

    # --- Load Previous Conversation ---
    try:
        if load_latest_conversation_history(memory):
            print("Successfully loaded previous conversation.")
        else:
            print("Starting a new conversation.")
    except Exception as e:
        print(f"An error occurred during conversation loading: {e}")
        print("Starting a new conversation.")
    # --- End Load ---

    # 3. Create Prompt Template
    # Includes placeholders for memory ('chat_history') and user input ('human_input')

    # Load the system prompt from the file
    with open("prompts/system_prompt.txt", "r", encoding="utf-8") as file:
        system_message = file.read()

    template = """{system_message}

        Previous conversation:
        {chat_history}

        New human input: {human_input}
        Response:"""

    prompt = PromptTemplate(
        input_variables=["system_message", "chat_history", "human_input"],
        template=template
    )

    # 4. Create the LangChain Chain using LCEL
    # Define how to load memory variables
    # RunnableLambda allows arbitrary functions in the chain
    # memory.load_memory_variables({}) returns a dict like {'chat_history': messages}
    load_memory = RunnableLambda(lambda _: memory.load_memory_variables({}))

    # Define the input structure for the prompt, loading memory and passing other inputs
    chain_input = RunnablePassthrough.assign(
        # Load chat_history using the function above, extracting the value
        chat_history=load_memory | RunnableLambda(lambda mem: mem.get('chat_history', [])),
        # Pass system_message and human_input through from the initial invoke call
        system_message=lambda x: x['system_message'],
        human_input=lambda x: x['human_input']
    )

    # Construct the LCEL chain: Input -> Prompt -> LLM -> Output Parser
    chain = (
        chain_input
        | prompt
        | llm
        | StrOutputParser() # Parses the LLM output message to a string
    )

    # 5. Implement the interaction loop
    print(f"Chatting with {config.model_name} via OpenRouter. Type 'quit' or 'exit' to end.")
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['quit', 'exit']:
                # --- Save Conversation Before Exiting ---
                save_conversation_history(memory)
                # --- End Save ---
                print("Exiting chatbot.")
                break

            # Prepare input dictionary for the LCEL chain's invoke method
            chain_input_dict = {
                "human_input": user_input,
                "system_message": system_message
                # chat_history is loaded dynamically by the 'load_memory' runnable
            }

            # Invoke the LCEL chain
            response = chain.invoke(chain_input_dict)
            print(f"Bot: {response}")

            # Manually save the context to memory for the next turn
            # Note: Ensure memory's input_key matches the key used here ("human_input")
            memory.save_context({"human_input": user_input}, {"output": response})

        except Exception as e:
            print(f"An error occurred: {e}")
            # Optionally break or continue based on error handling preference
            break

if __name__ == "__main__":
    main()