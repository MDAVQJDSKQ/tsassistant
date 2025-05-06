# Minimal Chatbot Project

## Overview
A lightweight, flexible chatbot application built using LangChain, designed to demonstrate core conversational AI functionality with conversation history persistence and documentation generation capabilities.

## Features
- Conversational AI core using LangChain
- Conversation history saving and loading
- JSON-based conversation persistence
- Automated documentation generation
- Cross-platform documentation update scripts

## Tech Stack
- Python
- LangChain
- OpenAI API
- Pydantic
- OpenRouter (for documentation generation)

## Requirements
Python 3.8+ with the following dependencies:
- langchain
- langchain-openai
- python-dotenv
- requests
- pydantic-settings

## Installation
1. Clone the repository
2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows use `venv\Scripts\activate`
```
3. Install dependencies
```bash
pip install -r requirements.txt
```

## Usage
### Running the Chatbot
```bash
python minimal_chatbot.py
```

### Generating Documentation
```bash
python scripts/generate_docs.py
python scripts/update_docs.py
```

## Project Structure
- `minimal_chatbot.py`: Core chatbot application
- `convos/`: Directory for storing conversation histories
- `prompts/`: Contains system prompts and configuration
- `scripts/`: Utility scripts for documentation and updates
- `requirements.txt`: Project dependencies

## Configuration
Set up your `.env` file with necessary API keys:
```
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License
[Specify your license, e.g., MIT]