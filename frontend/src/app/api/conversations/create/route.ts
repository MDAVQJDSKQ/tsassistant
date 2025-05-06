export async function POST() {
  console.log("Creating new conversation")
  
  try {
    const backendUrl = "http://localhost:8000/api/conversations/new"
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    })
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      })
    }
    
    const data = await response.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error creating conversation:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}