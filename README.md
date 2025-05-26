# Multi-Agent Chatbot Platform

## Overview

A sophisticated multi-agent chatbot platform that supports both traditional chat conversations and ASCII art generation. Built with a Next.js frontend and FastAPI backend, the platform offers flexible model selection, conversation management, and specialized ASCII art generation capabilities through multiple AI providers via OpenRouter integration.

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+
- OpenRouter API key

### Backend Setup

1. **Clone the repository and navigate to the backend directory**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   Create a `.env` file in the backend directory:
   ```env
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. **Start the backend server**
   ```bash
   python -m backend.backend_server
   ```

### Frontend Setup

1. **Navigate to the frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the frontend directory:
   ```env
   BACKEND_API_URL=http://localhost:8000
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Tech Stack

**Backend:**
- **Python** - Core backend language
- **FastAPI** - Web framework for API development
- **LangChain** - AI/LLM integration framework
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server

**Frontend:**
- **TypeScript/React** - Core frontend technologies
- **Next.js** - React framework with App Router
- **Tailwind CSS** - Styling framework
- **Jotai** - State management
- **shadcn/ui** - UI component library
- **Radix UI** - Headless UI primitives

**AI Integration:**
- **OpenRouter** - Multi-provider AI API gateway
- **LangChain OpenAI** - OpenRouter integration layer

## Features

### Core Chatbot Functionality
- **Multi-Model Support**: Access to various AI models through OpenRouter (Anthropic Claude, OpenAI GPT, Google Gemma, etc.)
- **Conversation Management**: Create, save, load, and delete conversations with persistent storage
- **Configurable Settings**: Adjustable model selection, system directives, and temperature settings
- **Real-time Chat**: Streaming responses with typing indicators

### ASCII Art Generation
- **Dedicated ASCII Chat Mode**: Specialized interface for ASCII art generation
- **Custom ASCII Tool**: Integrated LangChain tool for creating ASCII art with configurable dimensions
- **Fallback Generation**: Automatic fallback ASCII generation when AI models fail
- **ASCII Conversation Management**: Separate conversation tracking for ASCII-focused chats

### User Interface
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **Sidebar Navigation**: Conversation list with search and management features
- **Resizable Panels**: Adjustable layout with drag-to-resize functionality
- **Settings Panel**: Centralized configuration management
- **Model Pricing Display**: Real-time pricing information for different AI models

### Advanced Features
- **Title Generation**: Automatic conversation title generation based on chat history
- **Configuration Persistence**: Settings and conversations saved across sessions
- **Error Handling**: Comprehensive error states and user feedback
- **Debug Endpoints**: Development tools for troubleshooting

## Project Structure

### Backend (`/backend`)
- **`backend_server.py`** - Main FastAPI application with all API endpoints
- **`config.py`** - Configuration classes and settings management
- **`utils.py`** - Utility functions for conversation handling and title generation
- **`tools/`** - LangChain tools including ASCII art generator
- **`conversations/`** - Stored conversation data and configurations
- **`asciis/`** - ASCII conversation storage with separate organization
- **`settings/`** - Application-wide settings and preferences
- **`scripts/`** - Documentation generation and maintenance scripts

### Frontend (`/frontend/src`)
- **`app/`** - Next.js App Router pages and API routes
- **`components/`** - Reusable React components organized by feature
- **`atoms/`** - Jotai state management with async operations
- **`hooks/`** - Custom React hooks for complex state logic
- **`providers/`** - Context providers and state initialization
- **`lib/`** - Utility functions and helpers