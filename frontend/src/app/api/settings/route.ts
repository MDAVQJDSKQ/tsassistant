import { NextRequest, NextResponse } from "next/server";

// Define settings interface
interface Settings {
  central_model: string;
  api_key: string;
  title_generation_prompt?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body
    if (!body.centralModel) {
      return NextResponse.json({ error: "Central model is required" }, { status: 400 });
    }
    
    // Proxying the settings to backend server
    // This keeps API keys secure and only stored server-side
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        central_model: body.centralModel,
        api_key: body.apiKey,
        title_generation_prompt: body.titleGenerationPrompt
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend settings update failed:", errorText);
      return NextResponse.json(
        { error: "Failed to update settings on backend" },
        { status: response.status }
      );
    }
    
    // Return success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch settings from backend
    const response = await fetch(`${process.env.BACKEND_URL || 'http://localhost:8000'}/settings`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend settings fetch failed:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch settings from backend" },
        { status: response.status }
      );
    }
    
    const settings = await response.json();
    
    // Return the settings
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Settings API GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 