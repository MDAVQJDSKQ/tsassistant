import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversation_id, model_name, system_directive, temperature } = body;
    
    if (!conversation_id) {
      return NextResponse.json(
        { error: 'Missing required field: conversation_id' },
        { status: 400 }
      );
    }

    console.log(`Updating configuration for conversation: ${conversation_id}`, {
      model_name,
      system_directive: system_directive || null,
      temperature
    });
    
    // Call the backend API to update conversation configuration
    const response = await fetch(`http://localhost:8000/api/conversations/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation_id,
        model_name,
        system_directive,
        temperature
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error updating configuration: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to update configuration: ${response.statusText || errorText}` },
        { status: response.status }
      );
    }

    // Return the updated configuration
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in configuration update route:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration due to an internal error' },
      { status: 500 }
    );
  }
} 