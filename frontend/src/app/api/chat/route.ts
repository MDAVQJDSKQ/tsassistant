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

    console.log("Frontend API Route: Processing request. Conversation ID:", conversation_id);
    console.log("Frontend API Route: Messages:", JSON.stringify(messages, null, 2));

    // Option 2: Using the Python backend that already streams
    const backendUrl = "http://localhost:8000/api/chat";
    const backendResponse = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages,
        conversation_id: conversation_id || "default"
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

    // Important: Return the stream directly without transforming it
    // This is critical for streaming to work - do not buffer or re-encode
    return new Response(backendResponse.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Content-Type-Options': 'nosniff',
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