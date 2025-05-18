# Multi-Agent Chat Interface

## Overview
Multi-Agent Chat Interface is a versatile chatbot application that allows users to interact with various AI models through a modern web interface. The application features conversation management, customizable system prompts, model selection, and conversation history tracking. Users can create, save, retrieve, and customize multiple conversations with different AI personas and settings.

## Getting Started

### Prerequisites
- Node.js (for frontend)
- Python 3.8+ (for backend)
- OpenRouter API key

### Backend Setup
1. Clone the repository to your local machine
2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install the backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables by creating a `.env` file in the root directory:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```
5. Start the backend server:
   ```bash
   python -m backend.backend_server
   ```
   The backend will be available at http://localhost:8000

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the frontend directory:
   ```
   BACKEND_API_URL=http://localhost:8000
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:3000

## Tech Stack

### Backend
- **Python** - Core programming language
- **FastAPI** - Web framework for building APIs
- **LangChain** - Framework for working with language models
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server implementation

### Frontend
- **TypeScript** - Programming language
- **Next.js** - React framework for web applications
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Unstyled, accessible UI components
- **AI SDK** - Tools for AI interactions (OpenAI integration)

## Features

### Conversation Management
- Create new conversations with unique IDs
- List and retrieve all saved conversations
- Delete conversations
- Automatically generate titles for conversations based on content

### Model Configuration
- Select from multiple AI models (OpenAI, Anthropic, Google)
- Customize system prompts to define AI behavior
- Adjust temperature settings for response variety
- Save model configurations per conversation

### Chat Interface
- Real-time streaming responses
- Persistent conversation history
- Responsive design for mobile and desktop
- Sidebar for quick access to saved conversations

### Settings
- Global application settings
- Custom title generation prompts
- API key management

## Project Structure

- `backend/` - Python backend server and API
  - `backend_server.py` - Main FastAPI application
  - `minimal_chatbot.py` - Simple chatbot implementation
  - `config.py` - Configuration schemas
  - `utils.py` - Helper functions
  - `conversations/` - Stored conversation data
  - `prompts/` - System prompt templates
  - `scripts/` - Utility scripts for documentation

- `frontend/` - Next.js frontend application
  - `src/app/` - Next.js pages and API routes
  - `src/components/` - React components
    - `Chat/` - Chat-related components
    - `Settings/` - Settings-related components
    - `ui/` - Reusable UI components
  - `src/hooks/` - Custom React hooks
  - `src/lib/` - Utility functions

The application uses a modern API-based architecture with the backend handling the AI model interactions and conversation storage, while the frontend provides a responsive and intuitive user interface.