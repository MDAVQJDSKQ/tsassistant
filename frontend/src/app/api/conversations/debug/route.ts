import { NextResponse } from 'next/server';

export async function GET() {
  console.log("Debug endpoint called");
  
  try {
    // Step 1: Try to directly access the backend
    console.log("Testing direct backend access...");
    let backendResult;
    try {
      const backendResponse = await fetch("http://localhost:8000/api/conversations", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (backendResponse.ok) {
        backendResult = await backendResponse.json();
        console.log("Backend response success:", backendResult);
      } else {
        backendResult = { 
          error: `Backend returned status: ${backendResponse.status}`,
          text: await backendResponse.text()
        };
        console.error("Backend error:", backendResult);
      }
    } catch (backendError) {
      backendResult = { error: "Failed to connect to backend", details: String(backendError) };
      console.error("Backend connection error:", backendError);
    }
    
    // Step 2: Get original conversations list endpoint response
    console.log("Testing conversations list endpoint...");
    let listResult;
    try {
      // Use relative URL to call our own API endpoint
      const listResponse = await fetch(new URL("/api/conversations/list", "http://localhost:3000").toString(), {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      
      if (listResponse.ok) {
        listResult = await listResponse.json();
        console.log("List endpoint success:", listResult);
      } else {
        listResult = { 
          error: `List endpoint returned status: ${listResponse.status}`,
          text: await listResponse.text()
        };
        console.error("List endpoint error:", listResult);
      }
    } catch (listError) {
      listResult = { error: "Failed to call list endpoint", details: String(listError) };
      console.error("List endpoint error:", listError);
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      backendDirectResult: backendResult,
      listEndpointResult: listResult
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      error: "Debug endpoint failed",
      details: String(error)
    }, { status: 500 });
  }
} 