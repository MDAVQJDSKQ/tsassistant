"""
ASCII Art Generator Tool for LangChain

This tool generates ASCII art based on text descriptions with configurable dimensions using LLM.
"""

from langchain.tools import tool
from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import Optional
import textwrap
import os

# Import config for API access
try:
    from backend.config import config as global_app_config
except ImportError:
    from config import config as global_app_config


@tool
def ascii_art_generator_tool(
    description: str, 
    width: int = 80, 
    height: int = 24,
    model_name: Optional[str] = None
) -> str:
    """
    Generate ASCII art based on a text description using AI.
    
    This tool creates ASCII art representations of objects, animals, scenes, or concepts
    described in the input text. The output will be formatted to fit within the specified
    dimensions using standard ASCII characters and displayed in a nice box.
    
    Args:
        description (str): A clear description of what to draw in ASCII art. 
                          Examples: "a cat sitting", "a house with a tree", "a smiling face"
        width (int): Maximum width in characters (default: 80, must be positive)
        height (int): Maximum height in lines (default: 24, must be positive)
        model_name (str, optional): The model to use for generation. If not provided,
                                   will use the default from app settings.
    
    Returns:
        str: ASCII art representation of the described object/scene in a formatted box
    """
    
    # Validate inputs - accept any positive values
    if width <= 0:
        width = 80
    if height <= 0:
        height = 24
    
    # Get model from app settings if not provided
    if model_name is None:
        try:
            # Load app settings to get the central model
            import json
            settings_path = os.path.join("backend", "settings", "app_settings.json")
            if os.path.exists(settings_path):
                with open(settings_path, "r", encoding='utf-8') as f:
                    settings_data = json.load(f)
                raw_central_model = settings_data.get("central_model", "claude-3.5-haiku")
                
                # Map the central model setting to the full model name
                model_mapping = {
                    "claude-3.5-haiku": "anthropic/claude-3.5-haiku",
                    "claude-3.7-sonnet": "anthropic/claude-3.7-sonnet"
                }
                model_name = model_mapping.get(raw_central_model, "anthropic/claude-3.5-haiku")
            else:
                model_name = "anthropic/claude-3.5-haiku"  # Default fallback
        except Exception as e:
            print(f"Error loading model from settings: {e}. Using default.")
            model_name = "anthropic/claude-3.5-haiku"
    
    try:
        # Create LLM instance with the selected model
        llm = ChatOpenAI(
            model_name=model_name,
            openai_api_key=global_app_config.openrouter_api_key,
            openai_api_base=global_app_config.openrouter_api_base,
            temperature=0.7,
        )
        
        # Create a detailed prompt for ASCII art generation
        prompt_template = PromptTemplate(
            input_variables=["description", "width", "height"],
            template="""You are an expert ASCII art generator. Create ASCII art based on the following description.

IMPORTANT REQUIREMENTS:
- Maximum width: {width} characters per line
- Maximum height: {height} lines total
- Use only standard ASCII characters (no Unicode)
- Make the art recognizable and detailed within the size constraints
- Center the art if it's smaller than the maximum dimensions
- Do not include any explanatory text, just the ASCII art

Description: {description}

Generate the ASCII art now:"""
        )
        
        # Create and run the chain
        chain = prompt_template | llm | StrOutputParser()
        
        result = chain.invoke({
            "description": description,
            "width": width,
            "height": height
        })
        
        # Clean up the result
        ascii_art = result.strip()
        
        # Format the ASCII art in a nice box
        formatted_art = format_ascii_in_box(ascii_art, description, width, height)
        
        return formatted_art
        
    except Exception as e:
        # Fallback to simple ASCII if LLM fails
        print(f"Error generating ASCII art with LLM: {e}")
        return generate_fallback_ascii(description, width, height)


def format_ascii_in_box(ascii_art: str, description: str, width: int, height: int) -> str:
    """Format ASCII art in a nice display box."""
    
    lines = ascii_art.split('\n')
    
    # Clean up empty lines at start and end
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    
    # Ensure we don't exceed height limit
    if len(lines) > height - 4:  # Reserve space for box borders and title
        lines = lines[:height - 4]
    
    # Ensure we don't exceed width limit
    max_content_width = width - 4  # Reserve space for box borders
    cleaned_lines = []
    actual_width = 0
    
    for line in lines:
        if len(line) > max_content_width:
            line = line[:max_content_width]
        cleaned_lines.append(line)
        actual_width = max(actual_width, len(line))
    
    # Create the box
    box_width = min(max(actual_width + 4, len(description) + 10), width)
    title = f"ASCII Art: {description}"
    if len(title) > box_width - 4:
        title = title[:box_width - 7] + "..."
    
    # Build the formatted output
    result_lines = []
    
    # Top border with title
    result_lines.append("┌" + "─" * (box_width - 2) + "┐")
    title_line = f"│ {title:<{box_width - 4}} │"
    result_lines.append(title_line)
    result_lines.append("├" + "─" * (box_width - 2) + "┤")
    
    # ASCII art content
    for line in cleaned_lines:
        content_line = f"│ {line:<{box_width - 4}} │"
        result_lines.append(content_line)
    
    # Add padding if needed
    while len(result_lines) < height - 1:  # Reserve space for bottom border
        padding_line = f"│{' ' * (box_width - 2)}│"
        result_lines.append(padding_line)
    
    # Bottom border
    result_lines.append("└" + "─" * (box_width - 2) + "┘")
    
    return "\n".join(result_lines)


def generate_fallback_ascii(description: str, width: int, height: int) -> str:
    """Generate a simple fallback ASCII art when LLM fails."""
    
    # Simple fallback patterns
    if "cat" in description.lower():
        art = """
    /\\_/\\  
   (  o.o  ) 
    > ^ <
        """
    elif "dog" in description.lower():
        art = """
    /\\   /\\
   (  . .)
    )   (
   (  v  )
  ^^  ^^
        """
    elif "heart" in description.lower():
        art = """
   ♥♥   ♥♥
 ♥♥♥♥ ♥♥♥♥
♥♥♥♥♥♥♥♥♥♥
 ♥♥♥♥♥♥♥♥
  ♥♥♥♥♥♥
   ♥♥♥♥
    ♥♥
        """
    else:
        # Generic placeholder
        art = f"""
    ┌─────────────┐
    │             │
    │  {description[:9]:^9}  │
    │             │
    └─────────────┘
        """
    
    return format_ascii_in_box(art.strip(), description, width, height) 