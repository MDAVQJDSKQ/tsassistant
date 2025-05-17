# Chatbot Framework

## Overview

The Chatbot Framework is a full-stack application that provides a user-friendly interface for conversational AI interactions. It consists of a React/Next.js frontend and a Python (FastAPI) backend that integrates with language model APIs. The system allows users to create and manage multiple conversations with customizable parameters such as model selection, temperature settings, and system directives.

## Getting Started

### Prerequisites

- Node.js (for frontend)
- Python 3.8+ (for backend)
- OpenRouter API key

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd chatbot-framework
   ```

2. **Set up the backend**

   ```bash
   cd backend
   
   # Create a virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r ../requirements.txt
   
   # Create a .env file with your API key
   echo "OPENROUTER_API_KEY=your_api_key_here" > .env
   ```

3. **Set up the frontend**

   ```bash
   cd ../frontend
   
   # Install dependencies
   npm install
   
   # Create a .env.local file for frontend environment variables
   echo "BACKEND_API_URL=http://localhost:8000" > .env.local
   ```

### Running the Application

1. **Start the backend server**

   ```bash
   cd backend
   python backend_server.py
   ```
   
   This will start the FastAPI server on http://localhost:8000

2. **Start the frontend development server**

   ```bash
   cd ../frontend
   npm run dev
   ```
   
   This will start the Next.js development server with Turbopack on http://localhost:3000

3. **Access the application**
   
   Open your browser and navigate to http://localhost:3000

## Tech Stack

### Backend
- Python
- FastAPI
- Uvicorn
- LangChain
- Pydantic

### Frontend
- Next.js
- TypeScript
- React
- Tailwind CSS
- Radix UI components
- AI SDK (OpenAI integration)

## Features

### Conversation Management
- Create new conversations with unique IDs
- List existing conversations
- Load conversation history
- Save conversation state between sessions

### Customizable AI Parameters
- Select different language models (e.g., OpenAI GPT-4.1, Google Gemma)
- Customize system prompts/directives
- Adjust temperature settings for response randomness

### User Interface
- Responsive design with mobile support
- Dark mode support
- Clean, modern UI components using shadcn/ui
- Real-time streaming responses

### API Integration
- OpenRouter API integration for accessing various language models
- Backend proxy to secure API keys
- Structured API endpoints for conversation management

### Documentation Tools
- Automated project structure documentation
- README generation with AI assistance
- Cross-platform documentation update scripts

## Project Structure

- `/backend/` - Python backend server and utilities
  - `backend_server.py` - Main FastAPI server implementation
  - `minimal_chatbot.py` - Simplified chatbot implementation
  - `config.py` - Configuration settings
  - `utils.py` - Helper functions for conversation management
  - `/convos/` - Directory for storing conversation history
  - `/prompts/` - System prompts and templates
  - `/scripts/` - Utility scripts for documentation

- `/frontend/` - Next.js frontend application
  - `/src/app/` - Next.js app router pages and API routes
  - `/src/components/` - UI components
  - `/src/hooks/` - Custom React hooks
  - `/src/lib/` - Utility functions

- `/conversations/` - Stored conversation configurations
  - Each conversation has a unique UUID folder with configuration