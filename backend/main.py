import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# Import config and utils
from backend.config import config
from backend.utils import save_conversation_history, load_latest_conversation_history

# --- Pydantic Models for Request/Response ---
class ChatInput(BaseModel):
    user_input: str

class ChatOutput(BaseModel):
    bot_response: str

# --- FastAPI App Initialization ---
app = FastAPI(title="TSAssistant Chatbot API")

# --- Global Variables / Setup (Run once on startup) ---
llm = None
memory = None
chain = None
system_message = ""

@app.on_event("startup")
async def startup_event():
    """Loads resources and sets up the chain when the app starts."""
    global llm, memory, chain, system_message

    # Validate API Key
    if not config.openrouter_api_key or config.openrouter_api_key == "YOUR_API_KEY_HERE":
        print("Error: OPENROUTER_API_KEY not found or not set.")
        # In a real app, you might raise an exception or handle this differently
        # For now, we'll let it proceed but log the error.
        # raise RuntimeError("API Key not configured properly.") # Option

    # 1. Instantiate the LLM using config
    llm = ChatOpenAI(
        model_name=config.model_name,
        openai_api_key=config.openrouter_api_key,
        openai_api_base=config.openrouter_api_base,
        temperature=config.temperature,
    )

    # 2. Instantiate Memory using config
    memory = ConversationBufferWindowMemory(
        memory_key="chat_history",
        return_messages=True,
        input_key="human_input",
        k=config.memory_window_size
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

    # 3. Create Prompt Template
    try:
        with open("backend/prompts/system_prompt.txt", "r", encoding="utf-8") as file:
            system_message = file.read()
    except FileNotFoundError:
        print("Error: backend/prompts/system_prompt.txt not found. Using default empty system message.")
        system_message = "You are a helpful assistant." # Fallback

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
    load_memory = RunnableLambda(lambda _: memory.load_memory_variables({}))

    chain_input_structure = RunnablePassthrough.assign(
        chat_history=load_memory | RunnableLambda(lambda mem: mem.get('chat_history', [])),
        system_message=lambda x: x['system_message'],
        human_input=lambda x: x['human_input']
    )

    chain = (
        chain_input_structure
        | prompt
        | llm
        | StrOutputParser()
    )
    print("Chatbot chain initialized successfully.")


# --- API Endpoint ---
@app.post("/chat", response_model=ChatOutput)
async def chat_endpoint(chat_input: ChatInput):
    """Receives user input and returns the chatbot's response."""
    global chain, memory, system_message

    if not chain or not memory or not llm:
         raise HTTPException(status_code=503, detail="Chatbot service not ready.")

    try:
        # Prepare input dictionary for the LCEL chain's invoke method
        chain_input_dict = {
            "human_input": chat_input.user_input,
            "system_message": system_message
            # chat_history is loaded dynamically within the chain
        }

        # Invoke the LCEL chain asynchronously
        response = await chain.ainvoke(chain_input_dict) # Use ainvoke for async

        # Manually save the context to memory for the next turn
        await memory.asave_context({"human_input": chat_input.user_input}, {"output": response})

        # --- Save Conversation After Interaction ---
        # Consider moving this to a background task or shutdown event for performance
        save_conversation_history(memory)
        # --- End Save ---

        return ChatOutput(bot_response=response)

    except Exception as e:
        print(f"An error occurred during chat processing: {e}")
        # Log the full traceback for debugging if needed
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

# --- Optional: Root endpoint for basic check ---
@app.get("/")
async def root():
    return {"message": "TSAssistant Chatbot API is running."}

# Note: To run this app, use: uvicorn main:app --reload
