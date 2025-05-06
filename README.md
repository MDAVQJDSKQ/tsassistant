# LangChain Chat Application

## Overview
A real-time chatbot application built with LangChain and Next.js. This project provides a full-stack solution with a FastAPI backend handling LangChain processing and a Next.js frontend for user interactions. The application supports conversation history persistence, conversation management, and streaming responses from AI models via OpenRouter.

## Getting Started

### Prerequisites
- Python 3.8 or higher
- Node.js 18 or higher
- OpenRouter API key

### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/MDAVQJDSKQ/tsassistant.git
   ```

2. Set up the Python environment:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the backend directory with:
   ```
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. Start the backend server:
   ```bash
   python -m backend.backend_server
   ```

### Frontend Setup
1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at http://localhost:3000

## Tech Stack

### Backend
- **Python**: Core programming language
- **FastAPI**: Web framework for the backend API
- **LangChain**: Framework for building applications with language models
- **Uvicorn**: ASGI server for serving the FastAPI application

### Frontend
- **TypeScript**: Programming language
- **Next.js**: React framework for web applications
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Unstyled, accessible UI components
- **AI SDK**: Tools for integrating AI capabilities in React applications

## Features

### Core Functionality
- **Conversational AI Interface**: Interactive chatbot powered by LangChain
- **Conversation Management**: Create, list, and load conversation history
- **Persistent Storage**: Save and retrieve conversations using UUID-based file storage
- **Streaming Responses**: Real-time AI responses using streaming capabilities

### Developer Tools
- **Documentation Generation**: Scripts to generate project structure documentation
- **Conversation Migration**: Tool to migrate conversation files to UUID format
- **API Testing**: Test endpoints for backend validation

### User Interface
- **Responsive Design**: Mobile and desktop friendly interface
- **Sidebar Navigation**: Easy access to previous conversations
- **Real-time Interactions**: Instant feedback during chat sessions

## Project Structure

### Backend
- `backend_server.py`: FastAPI server implementation with chat endpoints
- `config.py`: Configuration settings for the chatbot
- `main.py`: Main application entry point
- `utils.py`: Utility functions for conversation management
- `minimal_chatbot.py`: Simplified chatbot for testing/development
- `prompts/`: Directory containing system prompts
- `convos/`: Directory storing conversation history as JSON files
- `scripts/`: Utility scripts for documentation and maintenance

### Frontend
- `src/app/`: Main Next.js application code
- `src/components/`: UI components (buttons, inputs, sidebar, etc.)
- `src/hooks/`: Custom React hooks
- `src/lib/`: Utility functions
- `public/`: Static assets
- `api/`: API route handlers for frontend-to-backend communication

The application uses a client-server architecture where the Next.js frontend communicates with the FastAPI backend to process chat interactions through the LangChain framework, providing a seamless chat experience.