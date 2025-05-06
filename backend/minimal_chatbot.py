import os
# Removed dotenv, pydantic_settings, json, typing, schema imports (handled elsewhere)
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain # Replaced by LCEL
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# Import config and utils
from backend.config import config
from backend.utils import save_conversation_history, load_latest_conversation_history


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
    with open("backend/prompts/system_prompt.txt", "r", encoding="utf-8") as file:
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