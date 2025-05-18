#!/bin/bash
# Test script for title generation

echo "Testing chat title generation with custom prompt"

# 1. Update settings with a custom title generation prompt
echo "Setting a custom title generation prompt..."
curl -X POST http://localhost:8000/settings \
  -H "Content-Type: application/json" \
  -d '{
    "central_model": "claude-3.7-sonnet",
    "title_generation_prompt": "Create a very concise, one-phrase title (maximum 3-4 words) that captures the main topic discussed in this conversation. Return ONLY the title, no quotes, no explanation."
  }'

echo -e "\n\nGenerating a title for a conversation..."
# Replace with an actual conversation ID from your system
CONVERSATION_ID="20908cc4-5bf8-424e-baaa-fe747be268e0"

# 2. Generate a title
curl -X POST http://localhost:8000/api/conversations/${CONVERSATION_ID}/generate-title

echo -e "\n\nDone!" 