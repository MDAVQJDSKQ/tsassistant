import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversation ID' },
        { status: 400 }
      );
    }
    
    // Call the backend API to generate a title
    const response = await fetch(
      `${process.env.BACKEND_URL || 'http://localhost:8000'}/api/conversations/${conversationId}/generate-title`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error generating title: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to generate title: ${response.statusText || errorText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in title generation route:', error);
    return NextResponse.json(
      { error: 'Failed to generate title' },
      { status: 500 }
    );
  }
} 