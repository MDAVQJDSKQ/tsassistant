export async function GET() {
  console.log("Fetching conversation list from backend")
  
  try {
    const backendUrl = "http://localhost:8000/api/conversations"
    console.log(`Calling backend URL: ${backendUrl}`)
    
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: 'no-store' // Ensure we don't use cached response
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Backend returned error status ${response.status}: ${errorText}`)
      return new Response(JSON.stringify({ 
        error: "Failed to fetch conversations",
        status: response.status,
        details: errorText
      }), {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      })
    }
    
    const data = await response.json()
    console.log(`Backend returned ${data.length} conversations`)
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: String(error) 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}