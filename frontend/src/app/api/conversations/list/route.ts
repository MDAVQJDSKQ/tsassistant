export async function GET() {
  console.log("Fetching conversation list from backend")
  
  try {
    const backendUrl = "http://localhost:8000/api/conversations"
    const response = await fetch(backendUrl)
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch conversations" }), {
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
    console.error("Error fetching conversations:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}