# Minimal Chatbot Documentation Generator

## Overview
This project is a documentation generation and management tool for a minimal chatbot application, featuring AI-powered documentation creation and project structure analysis.

## Features
- AI-powered documentation generation
- Project file tree structure creation
- Cross-platform documentation update script
- OpenRouter API integration for documentation tasks

## Tech Stack
- Python
- LangChain
- OpenRouter AI
- python-dotenv

## Installation

### Prerequisites
- Python 3.8+
- OpenRouter API Key

### Steps
1. Clone the repository
2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
Create a `.env` file and add your OpenRouter API key:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## Usage

### Generate Documentation
Run the documentation generation script:
```bash
python scripts/generate_docs.py
```

### Update Documentation
Run the cross-platform documentation update script:
```bash
python scripts/update_docs.py
```

## Project Structure
- `minimal_chatbot.py`: Main chatbot application
- `scripts/generate_docs.py`: Documentation generation script using AI
- `scripts/update_docs.py`: Cross-platform documentation update script
- `requirements.txt`: Project dependency list
- `system_prompt.txt`: System prompt configuration

## Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License
[Specify your project's license]

## Contact
[Add contact information or project maintainer details]