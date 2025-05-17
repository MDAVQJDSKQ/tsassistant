import { NextResponse } from 'next/server';

/**
 * DELETE handler for deleting a conversation by ID
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;
    console.log(`Deleting conversation: ${conversationId}`);
    
    // Call the backend API to delete the conversation
    const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error deleting conversation: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to delete conversation: ${response.statusText || errorText}` },
        { status: response.status }
      );
    }

    // Successfully deleted
    return NextResponse.json({ success: true, message: `Conversation ${conversationId} deleted successfully` });
  } catch (error) {
    console.error('Error in conversation delete route:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation due to an internal error' },
      { status: 500 }
    );
  }
} 