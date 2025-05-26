"""
Script to generate a text file representing the project file tree structure and a README.md with AI-generated content using OpenRouter.

Environment variables required:
- OPENROUTER_API_KEY: Your OpenRouter API key (recommended to set in a .env file)
"""

import os
import sys
import time
import fnmatch
import pathlib
import requests
import argparse
from glob import glob
from dotenv import load_dotenv

# Load environment variables from .env if present
load_dotenv()

# --- Configuration ---
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
OPENROUTER_API_BASE = "https://openrouter.ai/api/v1/chat/completions"
MODEL_NAME = "anthropic/claude-sonnet-4" # Model specified by the user
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


def parse_gitignore_file(gitignore_path, base_dir=None):
    """
    Parse a .gitignore file and return the list of patterns.
    Converts patterns to be relative to the project root.
    """
    patterns = []
    if not os.path.exists(gitignore_path):
        return patterns
    
    try:
        with open(gitignore_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.rstrip()
                # Skip empty lines and comments
                if not line or line.startswith('#'):
                    continue
                
                # Handle negation pattern (include)
                is_negation = line.startswith('!')
                if is_negation:
                    pattern = line[1:].strip()
                else:
                    pattern = line
                
                # Make the pattern relative to the project root if needed
                if base_dir and base_dir != '.':
                    pattern = os.path.join(base_dir, pattern)
                
                if is_negation:
                    pattern = '!' + pattern
                
                patterns.append(pattern)
    except Exception as e:
        print(f"Error parsing {gitignore_path}: {e}")
    
    return patterns


def get_gitignore_patterns(project_root):
    """
    Collect all gitignore patterns from:
    1. Global gitignore (user's git config)
    2. Repository's root .gitignore
    3. All subdirectory .gitignore files
    4. Common defaults for safety
    """
    patterns = []
    
    # Default patterns that should always be ignored
    default_patterns = [
        '.git/',
        '__pycache__/',
        '*.py[cod]',
        '*$py.class',
        '*.so',
        '.Python',
        '*.swp',
        '.DS_Store',
        'Thumbs.db'
    ]
    patterns.extend(default_patterns)
    
    # Try to get global gitignore from git config
    try:
        import subprocess
        result = subprocess.run(
            ["git", "config", "--global", "--get", "core.excludesfile"],
            capture_output=True, text=True, check=False
        )
        if result.returncode == 0 and result.stdout.strip():
            global_gitignore = result.stdout.strip()
            if os.path.exists(global_gitignore):
                global_patterns = parse_gitignore_file(global_gitignore)
                patterns.extend(global_patterns)
                print(f"Added {len(global_patterns)} patterns from global gitignore")
    except Exception as e:
        print(f"Warning: Could not read global gitignore: {e}")
    
    # Repository root .gitignore
    root_gitignore = os.path.join(project_root, '.gitignore')
    if os.path.exists(root_gitignore):
        root_patterns = parse_gitignore_file(root_gitignore)
        patterns.extend(root_patterns)
        print(f"Added {len(root_patterns)} patterns from root .gitignore")
    
    # Find all subdirectory .gitignore files
    for dirpath, _, filenames in os.walk(project_root):
        if '.gitignore' in filenames and dirpath != project_root:
            rel_path = os.path.relpath(dirpath, project_root)
            sub_gitignore = os.path.join(dirpath, '.gitignore')
            sub_patterns = parse_gitignore_file(sub_gitignore, rel_path)
            patterns.extend(sub_patterns)
            print(f"Added {len(sub_patterns)} patterns from {rel_path}/.gitignore")
    
    # Look for language-specific gitignore patterns
    # For common languages/frameworks
    common_frameworks = {
        'node_modules': 'node',
        'package.json': 'node',
        'requirements.txt': 'python',
        'Cargo.toml': 'rust',
        'pom.xml': 'java', 
        'go.mod': 'go',
        '.next': 'nextjs'
    }
    
    detected_frameworks = set()
    # Check for presence of framework indicator files
    for indicator, framework in common_frameworks.items():
        if glob(f"{project_root}/**/{indicator}", recursive=True):
            detected_frameworks.add(framework)
    
    # Add framework-specific patterns
    framework_patterns = []
    if 'node' in detected_frameworks:
        framework_patterns.extend([
            'node_modules/',
            'npm-debug.log',
            'yarn-debug.log',
            'yarn-error.log',
            '.npm',
            '.pnp',
            '.pnp.js',
            '.yarn/'
        ])
    
    if 'python' in detected_frameworks:
        framework_patterns.extend([
            'venv/',
            '.env/',
            'env/',
            '.venv/',
            'ENV/',
            '*.egg-info/',
            'dist/',
            'build/',
            'develop-eggs/',
            '.installed.cfg',
            'eggs/',
            'parts/',
            'sdist/'
        ])
    
    if 'nextjs' in detected_frameworks:
        framework_patterns.extend([
            '.next/',
            'out/',
            '.vercel/'
        ])
    
    patterns.extend(framework_patterns)
    print(f"Added {len(framework_patterns)} framework-specific patterns for: {', '.join(detected_frameworks)}")
    
    return patterns


def match_gitignore_pattern(pattern, path, is_dir=False):
    """
    Match a gitignore pattern against a path, following gitignore rules.
    """
    # Negation patterns (like "!file.txt") are handled by the `is_ignored` function.

    # If a pattern ends with a slash (e.g., "node_modules/"),
    # it's intended to match a directory and everything inside it.
    # The original logic had an issue here:
    # `if pattern.endswith('/') and not is_dir: return False` was too restrictive.
    # A pattern "foo/" should match "foo/file.txt".
    # We let fnmatch handle the pattern as is, including any trailing slash.

    # Handle leading slash (anchored to repo root)
    if pattern.startswith(os.sep):
        # The pattern is anchored to the project root.
        # Match the path against the pattern without its leading slash.
        return fnmatch.fnmatch(path, pattern[len(os.sep):])

    # Handle patterns without a leading slash (e.g., "build/", "*.pyc", "docs")
    # These can match at any level in the directory structure.
    # We check if the pattern matches any suffix of the path.
    # For example, if pattern is "node_modules/" and path is "frontend/node_modules/some_file.js",
    # it should match when checking the subpath "node_modules/some_file.js".
    parts = path.split(os.sep)
    for i in range(len(parts)):
        subpath = os.sep.join(parts[i:])
        if fnmatch.fnmatch(subpath, pattern):
            return True
    
    return False


def is_ignored(path, gitignore_patterns, root_dir):
    """
    Check if a path should be ignored based on gitignore patterns.
    Uses a simplified but more aggressive approach to ensure directories like node_modules are fully excluded.
    """
    # Get the relative path from the project root
    rel_path = os.path.relpath(path, root_dir)
    
    # Skip already known paths like .git
    if '.git' in rel_path.split(os.sep):
        return True
    
    # Special handling for common large directories that should always be ignored
    critical_dirs = ['node_modules', '.next', 'venv', '__pycache__', '.git']
    path_parts = rel_path.split(os.sep)
    
    # If any part of the path matches a critical directory, ignore it
    for part in path_parts:
        if part in critical_dirs:
            return True
    
    # Now check against the gitignore patterns
    ignored = False
    for pattern in gitignore_patterns:
        # Handle negation patterns (which override previous ignores)
        if pattern.startswith('!'):
            neg_pattern = pattern[1:]
            if fnmatch.fnmatch(rel_path, neg_pattern):
                ignored = False
                continue
        
        # For directory patterns (ending with /)
        if pattern.endswith('/'):
            # Check if this path is this directory or is inside this directory
            pattern_parts = pattern[:-1].split(os.sep)  # Remove trailing slash
            
            # If pattern has fewer parts than the path, it could be a parent directory
            if len(pattern_parts) <= len(path_parts):
                # Check if the pattern matches the beginning of the path
                matches = True
                for i, pattern_part in enumerate(pattern_parts):
                    if not fnmatch.fnmatch(path_parts[i], pattern_part):
                        matches = False
                        break
                if matches:
                    ignored = True
                    continue
        
        # For regular file patterns
        if fnmatch.fnmatch(rel_path, pattern):
            ignored = True
    
    return ignored


def generate_tree(project_root, output_file, model_name, api_key, delay=API_DELAY):
    """
    Recursively walk through the directory structure and write the tree to output_file.
    Each file and directory will have an AI-generated description.
    Uses .gitignore patterns to determine what to exclude.
    """
    gitignore_patterns = get_gitignore_patterns(project_root)
    print(f"Using {len(gitignore_patterns)} gitignore patterns to filter files.")

    # --- Add pre-count logic ---
    print("Calculating items to process...")
    count_dirs_to_api = 0
    count_files_to_api = 0
    # To store paths for debugging what will be processed (optional)
    # processed_paths_for_debug = []

    for current_root, current_dirs, current_files in os.walk(project_root, topdown=True):
        rel_current_root = os.path.relpath(current_root, project_root)

        # If the current directory itself is ignored (and it's not the project root itself),
        # then we don't process it, its files, or its subdirectories.
        if rel_current_root != '.' and is_ignored(current_root, gitignore_patterns, project_root):
            current_dirs[:] = []  # Don't descend into subdirectories
            current_files[:] = [] # Don't process files in this ignored directory
            continue

        # Count this directory if it's not the project_root and not ignored.
        # The main loop makes an API call for directories when depth > 0.
        if rel_current_root != '.': # Excludes the top-level project root from this specific count
            count_dirs_to_api += 1
            # processed_paths_for_debug.append(f"DIR: {current_root}")

        # Prune subdirectories that will be ignored in subsequent os.walk iterations
        # Iterate over a copy of current_dirs when modifying it in place
        original_subdirs = list(current_dirs)
        current_dirs[:] = [d_name for d_name in original_subdirs if not is_ignored(os.path.join(current_root, d_name), gitignore_patterns, project_root)]

        # Count files in the current (non-ignored) directory
        for f_name in current_files:
            file_path_to_check = os.path.join(current_root, f_name)
            if not is_ignored(file_path_to_check, gitignore_patterns, project_root):
                count_files_to_api += 1
                # processed_paths_for_debug.append(f"FILE: {file_path_to_check}")
    
    total_api_calls_expected = count_dirs_to_api + count_files_to_api
    print(f"Will make API calls for approximately {count_dirs_to_api} directories and {count_files_to_api} files (Total: {total_api_calls_expected}).")
    # --- End pre-count logic ---

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
        # Filter directories based on gitignore patterns
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), gitignore_patterns, project_root)]
        
        rel_path = os.path.relpath(root, project_root)
        depth = 0 if rel_path == '.' else rel_path.count(os.sep) + 1
        indent = '    ' * (depth - 1) if depth > 0 else ''
        dir_name = os.path.basename(root) if depth > 0 else os.path.basename(project_root)
        
        if depth > 0:
            dir_path = os.path.join(project_root, rel_path)
            desc = get_description(dir_path, 'directory')
            tree_lines.append(f"{indent}+-- {dir_name}/ - {desc}")
            time.sleep(delay)
            
        # Filter files based on gitignore patterns
        for f in files:
            file_path = os.path.join(root, f)
            if is_ignored(file_path, gitignore_patterns, project_root):
                continue
                
            file_indent = indent + '    '
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
    Uses .gitignore patterns to determine what to exclude.
    """
    gitignore_patterns = get_gitignore_patterns(project_root)
    
    import ast
    import re
    readme_path = os.path.join(project_root, 'README.md')
    project_context = {}
    file_list = []
    env_vars = set()  # To collect environment variables
    dependencies = set()  # To collect dependencies
    
    # Walk the project and gather structure and code snippets
    for root, dirs, files in os.walk(project_root):
        # Filter directories based on gitignore patterns
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), gitignore_patterns, project_root)]
        
        rel_root = os.path.relpath(root, project_root)
        for f in files:
            file_path = os.path.join(root, f)
            if is_ignored(file_path, gitignore_patterns, project_root):
                continue
                
            rel_path = os.path.normpath(os.path.join(rel_root, f)) if rel_root != '.' else f
            file_list.append(rel_path)
            
            # Analyze files based on configurable extensions and special files
            analyze = False
            # Common code files
            if f.endswith(('.py', '.js', '.ts', '.java', '.c', '.cpp', '.go', '.rs', '.rb')):
                analyze = True
            # Configuration files
            elif f.endswith(('.toml', '.yaml', '.yml', '.json', '.xml', '.ini', '.cfg', '.env.example')):
                analyze = True
            # Documentation and package files
            elif f in ('requirements.txt', 'package.json', 'Cargo.toml', 'Gemfile', 'Dockerfile', 'docker-compose.yml'):
                analyze = True
                
            if analyze:
                try:
                    with open(file_path, 'r', encoding='utf-8') as file:
                        content = file.read()
                        snippet = ''
                        
                        # Extract environment variables
                        env_var_pattern = r'(?:os\.getenv|os\.environ\.get|process\.env)\s*\(\s*["\']([A-Z_]+)["\']'
                        for match in re.finditer(env_var_pattern, content):
                            env_vars.add(match.group(1))
                        
                        # Extract dependencies
                        if f == 'requirements.txt':
                            for line in content.splitlines():
                                if line and not line.startswith('#'):
                                    dependencies.add(line.split('==')[0].strip())
                        elif f == 'package.json':
                            import json
                            try:
                                pkg_data = json.loads(content)
                                if 'dependencies' in pkg_data:
                                    for dep in pkg_data['dependencies']:
                                        dependencies.add(dep)
                                if 'devDependencies' in pkg_data:
                                    for dep in pkg_data['devDependencies']:
                                        dependencies.add(dep)
                            except json.JSONDecodeError:
                                pass
                        
                        # Process Python files
                        if f.endswith('.py'):
                            # Try to extract docstrings and function/class signatures
                            try:
                                tree = ast.parse(content)
                                docstring = ast.get_docstring(tree)
                                snippet += f"Module docstring: {docstring}\n" if docstring else ''
                                
                                # Extract imports to identify dependencies
                                for node in ast.iter_child_nodes(tree):
                                    if isinstance(node, ast.Import):
                                        for name in node.names:
                                            dependencies.add(name.name.split('.')[0])
                                    elif isinstance(node, ast.ImportFrom):
                                        if node.module:
                                            dependencies.add(node.module.split('.')[0])
                                    
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
    project_context['_env_vars_'] = list(env_vars)
    project_context['_dependencies_'] = list(dependencies)
    
    # Build system and user messages
    system_message = {
        "role": "system",
        "content": (
            "You are an expert technical writer AI. Your task is to generate a comprehensive and well-structured README.md file for a software project. "
            "Use the provided project structure and code snippets to understand the project's purpose, features, and usage. "
            "Structure the README with these sections IN THIS EXACT ORDER:\n"
            "1. Project Title (Infer a suitable one if not obvious)\n"
            "2. Overview (A brief description of what the project does)\n"
            "3. Getting Started (Combine installation and usage instructions in a logical sequence - include setup, configuration, and how to run the application)\n"
            "4. Tech Stack (Identify programming languages and frameworks based on imports and file types)\n"
            "5. Features (Key function and major implementations based on the code/files)\n"
            "6. Project Structure (Briefly explain the purpose of key files/directories like src/, scripts/)\n"
            "Follow this section order precisely. For the Getting Started section, present installation and usage as a unified workflow with clear step-by-step instructions.\n\n"
            "IMPORTANT GUIDELINES:\n"
            "- Pay close attention to actual environment variables, API keys, and dependencies used in the code\n"
            "- Do not assume standard API providers (like OpenAI) unless explicitly found in the code\n"
            "- Look for imports, configuration files, and environment variable references to determine the actual services used\n"
            "- Be specific about which API keys or credentials are needed based only on what you can see in the code\n"
            "Format the output using Markdown."
        )
    }
    context_str = "Project Structure:\n" + "\n".join(project_context.get("_structure_", ["N/A"])) + "\n\n"

    # Add environment variables section
    if project_context.get("_env_vars_"):
        context_str += "Environment Variables Used:\n"
        for var in project_context.get("_env_vars_", []):
            context_str += f"- {var}\n"
        context_str += "\n"

    # Add dependencies section
    if project_context.get("_dependencies_"):
        context_str += "Dependencies:\n"
        for dep in project_context.get("_dependencies_", []):
            context_str += f"- {dep}\n"
        context_str += "\n"

    context_str += "Key File Snippets:\n"
    for path, snippet in project_context.items():
        if path not in ["_structure_", "_env_vars_", "_dependencies_"]:
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
    parser.add_argument('--list-gitignore', action='store_true', help="List all gitignore patterns and exit")
    args = parser.parse_args()

    # Determine project root
    if args.project_root:
        project_root = os.path.abspath(args.project_root)
    else:
        # Default: use the parent directory of the script's PARENT directory
        # This assumes the script is in something like project_root/backend/scripts/
        script_dir = os.path.dirname(os.path.abspath(__file__))  # .../backend/scripts/
        backend_dir = os.path.dirname(script_dir)               # .../backend/
        project_root = os.path.dirname(backend_dir)             # .../ (actual project root)
    
    # Just list gitignore patterns if requested
    if args.list_gitignore:
        patterns = get_gitignore_patterns(project_root)
        print(f"\nFound {len(patterns)} gitignore patterns:")
        for pattern in sorted(patterns):
            print(f"  {pattern}")
        return
    
    tree_file_path = os.path.join(project_root, args.tree_file)

    if args.task in ('tree', 'all'):
        print(f"Generating project structure at {tree_file_path}...")
        generate_tree(project_root, tree_file_path, args.model, OPENROUTER_API_KEY, args.delay)
        print(f"Project structure written to {tree_file_path}")
    if args.task in ('readme', 'all'):
        generate_readme(project_root, OPENROUTER_API_KEY, args.model)


if __name__ == "__main__":
    main()
