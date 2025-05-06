# LangChain Chatbot

## Overview
A full-stack chatbot application built with LangChain and Next.js. This project features a FastAPI backend that leverages the OpenRouter API for AI chat capabilities, and a modern Next.js frontend with Tailwind CSS for the user interface. The chatbot maintains conversation history, allowing users to create, view, and continue multiple conversations.

## Getting Started
Follow these steps to set up and run the LangChain Chatbot application:

### Prerequisites
- Python 3.7+
- Node.js 18+
- npm or yarn
- OpenRouter API key

### Backend Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the project root with your API key:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. Start the backend server:
   ```bash
   cd backend
   uvicorn main:app --reload
   ```
   
   This will start the FastAPI server at http://localhost:8000

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
   
   This will start the Next.js development server at http://localhost:3000

4. Open your browser and navigate to http://localhost:3000 to use the chatbot application.

## Tech Stack
- **Backend**:
  - Python
  - FastAPI
  - LangChain
  - Uvicorn
  - Pydantic
  - dotenv

- **Frontend**:
  - Next.js
  - TypeScript
  - Tailwind CSS
  - AI SDK (OpenAI)
  - Radix UI components
  - Lucide React Icons

## Features

### Chat Interface
- Interactive chat UI with real-time streaming responses
- Conversation persistence across sessions
- Multiple conversation support with management features

### Backend API
- RESTful endpoints for chat functionality
- Conversation management (create, list, retrieve)
- Integration with OpenRouter API for AI responses
- Memory-based conversation history tracking

### Conversation Management
- Create new conversations
- View list of existing conversations
- Load conversation history
- Automatic saving of chat history to JSON files

### Development Tools
- Documentation generation scripts
- Project structure visualization
- Conversation file migration utilities
- Cross-platform update documentation scripts

## Project Structure
- **backend/**: Contains the FastAPI server and chat functionality
  - `main.py`: Entry point for the FastAPI application
  - `backend_server.py`: Core API endpoints and request handling
  - `minimal_chatbot.py`: Basic chatbot implementation
  - `utils.py`: Utility functions for conversation management
  - `config.py`: Configuration settings for the chatbot
  - `convos/`: Directory storing conversation history as JSON files
  - `prompts/`: Contains system prompts for the AI
  - `scripts/`: Utility scripts for documentation and maintenance

- **frontend/**: Next.js application
  - `src/app/`: Next.js pages and API routes
  - `src/components/`: UI components including chat interface
  - `src/hooks/`: Custom React hooks
  - `src/lib/`: Utility functions and shared code
  - `public/`: Static assets and images