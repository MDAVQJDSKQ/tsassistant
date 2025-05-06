#!/usr/bin/env python3
"""
Cross-platform interactive script to update project documentation.
This replaces the Windows-specific batch file with a Python script that works everywhere.
"""

import os
import sys
import subprocess

def main():
    # Display options to the user
    print("Select documentation to update:")
    print("1. File Tree Only (project_structure.txt)")
    print("2. README Only (README.md)")
    print("3. Both File Tree and README")
    
    # Get user input
    try:
        choice = input("Enter your choice (1, 2, or 3): ")
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        return 1
    
    # Determine the script path relative to the current directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    generate_docs_path = os.path.join(script_dir, "generate_docs.py")
    
    # Construct the command based on user choice
    if choice == "1":
        print("Updating File Tree...")
        cmd = [sys.executable, generate_docs_path, "--task", "tree"]
    elif choice == "2":
        print("Updating README...")
        cmd = [sys.executable, generate_docs_path, "--task", "readme"]
    elif choice == "3":
        print("Updating File Tree and README...")
        cmd = [sys.executable, generate_docs_path, "--task", "all"]
    else:
        print("Invalid choice. Exiting.")
        return 1
    
    # Execute the command
    try:
        subprocess.run(cmd, check=True)
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())