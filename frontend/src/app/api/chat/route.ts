// Import streamText helper from ai
import { streamText } from 'ai';

export async function POST(req: Request) {
  console.log("Frontend API Route: Received request.");

  try {
    const body = await req.json();
    console.log("Frontend API Route: Request body parsed:", body);

    const { messages, conversation_id } = body;

    if (!messages || !Array.isArray(messages)) {
      console.error("Frontend API Route: 'messages' array is missing or not an array in request body.");
      return new Response(JSON.stringify({
        error: "Messages array is missing or invalid in request."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // --- Validate conversation_id ---
    if (!conversation_id || typeof conversation_id !== 'string' || conversation_id.trim() === "") {
      console.error("Frontend API Route: 'conversation_id' is missing or invalid in request body.");
      return new Response(JSON.stringify({
        error: "Conversation ID is missing or invalid."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    // --- End validation ---

    console.log("Frontend API Route: Processing request. Conversation ID:", conversation_id);
    console.log("Frontend API Route: Messages:", JSON.stringify(messages, null, 2));

    // Option 2: Using the Python backend that already streams
    const backendUrl = "http://localhost:8000/api/chat";
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        conversation_id: conversation_id // Removed "|| default"
      })
    });

    console.log(`Frontend API Route: Backend fetch response status: ${backendResponse.status}`);

    if (!backendResponse.ok) {
      console.error(`Frontend API Route: Error from backend server. Status: ${backendResponse.status}`);
      return new Response(
        JSON.stringify({ error: `Error from backend: ${backendResponse.status}` }), 
        { 
          status: backendResponse.status,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Create a TransformStream that properly preserves line breaks when extracting content
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    const transformStream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk);
        
        try {
          // Parse the JSON and extract just the content field
          const json = JSON.parse(text);
          if (json && json.content !== undefined) {
            // Send the raw content exactly as provided by the backend
            // This preserves all formatting including line breaks
            controller.enqueue(encoder.encode(json.content));
          } else {
            // Fallback if content field is missing
            controller.enqueue(encoder.encode(text));
          }
        } catch (e) {
          // If JSON parsing fails, send the raw text
          controller.enqueue(encoder.encode(text));
        }
      }
    });
    
    return new Response(backendResponse.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error("Frontend API Route: Critical error in POST handler:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    return new Response(JSON.stringify({
      error: `Error processing chat request: ${errorMessage}`
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}