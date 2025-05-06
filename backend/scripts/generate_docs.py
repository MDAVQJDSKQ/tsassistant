"""
Script to generate a text file representing the project file tree structure and a README.md with AI-generated content using OpenRouter.

Environment variables required:
- OPENROUTER_API_KEY: Your OpenRouter API key (recommended to set in a .env file)
"""

import os
import sys
import time
import requests
import argparse
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# List of directory and file names to exclude from the tree
EXCLUDE_DIRS = {'.git', '__pycache__', '.venv', 'venv', 'env', 'node_modules', '.vscode', '.idea', 'dist', 'build', 'convos'}
EXCLUDE_FILES = {'.env', '.gitignore'}

# --- Configuration ---
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_API_BASE = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME = "anthropic/claude-3.5-haiku" # Model specified by the user
API_DELAY = 0.5  # Delay between API calls in seconds
# --- End Configuration ---


def call_openrouter_api(system_message, user_message, model_name, api_key):
    """
    General-purpose function to call the OpenRouter API with custom system and user messages.
    Returns the AI's response content or an error message.
    """
    if not api_key:
        return "# OpenRouter API key not set"
    url = OPENROUTER_API_BASE
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/yourusername/yourrepo",  # Optional
        "X-Title": "Project Documentation Generator"  # Optional
    }
    data = {
        "model": model_name,
        "messages": [system_message, user_message]
    }
    try:
        response = requests.post(url, headers=headers, json=data, timeout=20)
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip()
        else:
            return f"# AI call failed (status {response.status_code})"
    except Exception as e:
        return f"# AI call failed ({str(e)})"


def generate_tree(project_root, output_file, exclude_dirs, exclude_files, model_name, api_key, delay=API_DELAY):
    """
    Recursively walk through the directory structure and write the tree to output_file.
    Each file and directory will have an AI-generated description.
    """
    def get_description(item_path, item_type):
        system_message = {
            "role": "system",
            "content": (
                "You are an AI assistant tasked with generating concise, one-sentence descriptions "
                "for files and directories in a project. Do not repeat the item's name or mention "
                "its file path. Focus solely on describing its purpose or functionality."
            )
        }
        user_message = {
            "role": "user",
            "content": f"Describe the purpose of the {item_type} named '{os.path.basename(item_path)}'."
        }
        return call_openrouter_api(system_message, user_message, model_name, api_key)

    tree_lines = []
    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        rel_path = os.path.relpath(root, project_root)
        depth = 0 if rel_path == '.' else rel_path.count(os.sep) + 1
        indent = '    ' * (depth - 1) if depth > 0 else ''
        dir_name = os.path.basename(root) if depth > 0 else os.path.basename(project_root)
        if depth > 0:
            dir_path = os.path.join(project_root, rel_path)
            desc = get_description(dir_path, 'directory')
            tree_lines.append(f"{indent}+-- {dir_name}/ - {desc}")
            time.sleep(delay)
        for f in files:
            if f in exclude_files:
                continue
            file_indent = indent + '    '
            file_path = os.path.join(root, f)
            desc = get_description(file_path, 'file')
            tree_lines.append(f"{file_indent}|-- {f} - {desc}")
            time.sleep(delay)
    
    # Add this code to write the tree data to the file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(tree_lines))
    except Exception as e:
        print(f"Error writing to {output_file}: {e}")


def generate_readme(project_root, api_key, model_name):
    """
    Generate a README.md file for the project using the AI, based on project structure and code analysis.
    """
    import ast
    readme_path = os.path.join(project_root, 'README.md')
    project_context = {}
    file_list = []
    # Walk the project and gather structure and code snippets
    for root, dirs, files in os.walk(project_root):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        rel_root = os.path.relpath(root, project_root)
        for f in files:
            if f in EXCLUDE_FILES:
                continue
            rel_path = os.path.normpath(os.path.join(rel_root, f)) if rel_root != '.' else f
            file_list.append(rel_path)
            # Analyze files based on configurable extensions and special files
            analyze = False
            # Common code files
            if f.endswith(('.py', '.js', '.ts', '.java', '.c', '.cpp', '.go', '.rs', '.rb')):
                analyze = True
            # Configuration files
            elif f.endswith(('.toml', '.yaml', '.yml', '.json', '.xml', '.ini', '.cfg')):
                analyze = True
            # Documentation and package files
            elif f in ('requirements.txt', 'package.json', 'Cargo.toml', 'Gemfile', 'Dockerfile', 'docker-compose.yml'):
                analyze = True
            if analyze:
                try:
                    with open(os.path.join(root, f), 'r', encoding='utf-8') as file:
                        content = file.read()
                        snippet = ''
                        if f.endswith('.py'):
                            # Try to extract docstrings and function/class signatures
                            try:
                                tree = ast.parse(content)
                                docstring = ast.get_docstring(tree)
                                snippet += f"Module docstring: {docstring}\n" if docstring else ''
                                for node in ast.iter_child_nodes(tree):
                                    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                                        sig = f"class {node.name}" if isinstance(node, ast.ClassDef) else f"def {node.name}{ast.unparse(node.args) if hasattr(ast, 'unparse') else ''}"
                                        snippet += sig + '\n'
                                        doc = ast.get_docstring(node)
                                        if doc:
                                            snippet += f'  Doc: {doc}\n'
                            except Exception:
                                snippet = content[:500]
                        else:
                            snippet = content[:500]
                        project_context[rel_path] = snippet.strip()
                except (FileNotFoundError, UnicodeDecodeError):
                    continue
    project_context['_structure_'] = file_list
    # Build system and user messages
    system_message = {
        "role": "system",
        "content": (
            "You are an expert technical writer AI. Your task is to generate a comprehensive and well-structured README.md file for a software project. "
            "Use the provided project structure and code snippets to understand the project's purpose, features, and usage. "
            "Structure the README with standard sections like:\n"
            "- Project Title (Infer a suitable one if not obvious)\n"
            "- Overview (A brief description of what the project does)\n"
            "- Installation (Provide basic steps, mention requirements.txt if applicable)\n"
            "- Features (Key function and major implementations based on the code/files)\n"
            "- Tech Stack (Identify programming languages and frameworks based on imports and file types)\n"
            "- Usage (Explain how to run the application based on the project structure)\n"
            "- Project Structure (Briefly explain the purpose of key files/directories like src/, scripts/)\n"
            "Focus on clarity and accuracy based *only* on the provided context. Format the output using Markdown."
        )
    }
    context_str = "Project Structure:\n" + "\n".join(project_context.get("_structure_", ["N/A"])) + "\n\n"
    context_str += "Key File Snippets:\n"
    for path, snippet in project_context.items():
        if path != "_structure_":
            context_str += f"--- {path} ---\n{snippet}\n\n"

    print("Generating README.md...")
    user_message = {
        "role": "user",
        "content": context_str
    }
    content = call_openrouter_api(system_message, user_message, model_name, api_key)
    try:
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("README.md generated successfully.")
    except Exception as e:
        print(f"Error writing README.md: {e}")


def main():
    parser = argparse.ArgumentParser(description="Generate project file tree and README.md using OpenRouter AI.")
    parser.add_argument('--task', choices=['tree', 'readme', 'all'], default='all', help="Task to perform: generate 'tree', 'readme', or 'all' (default: all)")
    parser.add_argument('--tree-file', default='project_structure.txt', help="Output file for the project tree (default: project_structure.txt)")
    parser.add_argument('--model', default=MODEL_NAME, help="OpenRouter model to use")
    parser.add_argument('--project-root', default=None, help="Project root directory (default: parent directory of script)")
    parser.add_argument('--delay', type=float, default=API_DELAY, help=f"Delay between API calls in seconds (default: {API_DELAY})")
    args = parser.parse_args()

    # Determine project root
    if args.project_root:
        project_root = os.path.abspath(args.project_root)
    else:
        # Default: use parent directory of the script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
    
    tree_file_path = os.path.join(project_root, args.tree_file)

    if args.task in ('tree', 'all'):
        print(f"Generating project structure at {tree_file_path}...")
        generate_tree(project_root, tree_file_path, EXCLUDE_DIRS, EXCLUDE_FILES, args.model, OPENROUTER_API_KEY, args.delay)
        print(f"Project structure written to {tree_file_path}")
    if args.task in ('readme', 'all'):
        generate_readme(project_root, OPENROUTER_API_KEY, args.model)


if __name__ == "__main__":
    main()
