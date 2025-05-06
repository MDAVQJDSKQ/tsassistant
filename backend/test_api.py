# test_api.py
import requests
import json

# --- Configuration ---
BASE_URL = "http://127.0.0.1:8000" # Make sure this matches where your server is running
API_ENDPOINT = f"{BASE_URL}/api/chat"
CONVERSATION_ID = "my-test-session-123" # Choose an ID for testing
# ---------------------

# --- Define the conversation history and the new message ---
# Simulate messages as expected by the backend's ChatRequest model
# On the first request for a new conversation_id, messages might just be the first user message.
# On subsequent requests, you might include previous messages, but the backend primarily
# cares about the latest one to process and uses the ID to load server-side memory.
# Let's simulate sending just the latest user message in the payload for simplicity,
# assuming the backend uses the conversation_id to manage full history.

user_message = input("Enter your message: ")

payload = {
    "conversation_id": CONVERSATION_ID,
    "messages": [
        # Example history (optional to send, backend relies on server-side memory via ID)
        # {"role": "user", "content": "Previous message"},
        # {"role": "assistant", "content": "Previous response"},
        {"role": "user", "content": user_message} # The latest message
    ]
}
# ----------------------------------------------------------

print(f"Sending request to {API_ENDPOINT} with payload:")
print(json.dumps(payload, indent=2))

try:
    # Send the POST request
    response = requests.post(API_ENDPOINT, json=payload) # 'json=' automatically sets Content-Type header

    # Check the response status code
    print(f"\nResponse Status Code: {response.status_code}")

    # Try to parse and print the JSON response
    if response.status_code == 200:
        try:
            response_data = response.json()
            print("\nResponse JSON:")
            print(json.dumps(response_data, indent=2))
        except json.JSONDecodeError:
            print("\nError: Could not decode JSON response.")
            print("Response Text:", response.text)
    else:
        # Print error details if not successful
        print("\nError Response:")
        try:
            print(json.dumps(response.json(), indent=2))
        except json.JSONDecodeError:
            print(response.text)

except requests.exceptions.ConnectionError as e:
    print(f"\nConnection Error: Could not connect to the server at {BASE_URL}.")
    print("Please ensure the backend_server.py is running.")
except Exception as e:
    print(f"\nAn unexpected error occurred: {e}")