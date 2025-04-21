import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationTokenBufferMemory
from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain # Replaced by LCEL
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# Load environment variables from .env file
load_dotenv()

# Load environment variables from .env file

# --- Configuration ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_BASE = "https://openrouter.ai/api/v1"
MODEL_NAME = "anthropic/claude-3.5-haiku" # Model specified by the user
# --- End Configuration ---

def main():
    """Runs the minimal chatbot application."""

    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "YOUR_API_KEY_HERE":
        print("Error: OPENROUTER_API_KEY not found or not set in .env file.")
        print("Please add your key to the .env file.")
        return

    # 1. Instantiate the LLM
    llm = ChatOpenAI(
        model_name=MODEL_NAME,
        openai_api_key=OPENROUTER_API_KEY,
        openai_api_base=OPENROUTER_API_BASE,
        # Optional: Add headers if needed by OpenRouter, though often not required
        # headers={"HTTP-Referer": $YOUR_SITE_URL, "X-Title": $YOUR_SITE_NAME}
        temperature=0.7, # Adjust creativity/randomness
    )

    # 2. Instantiate Memory
    # memory_key must match the input variable in the prompt template
    # For LCEL, we'll manage memory loading/saving manually in the loop
    memory = ConversationTokenBufferMemory(
        memory_key="chat_history",
        return_messages=True,
        input_key="human_input",
        max_token_limit=5000,  # Maximum tokens to keep in history
        llm=llm  # Use your existing LLM for token counting
    )

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
    print(f"Chatting with {MODEL_NAME} via OpenRouter. Type 'quit' or 'exit' to end.")
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() in ['quit', 'exit']:
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