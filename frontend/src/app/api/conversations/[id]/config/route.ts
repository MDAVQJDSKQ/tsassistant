import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    console.log(`Fetching configuration for conversation: ${conversationId}`);
    
    // Call the backend API to get conversation configuration
    const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensures we don't cache the response
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching configuration: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to fetch configuration: ${response.statusText || errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in conversation config route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation configuration' },
      { status: 500 }
    );
  }
} 