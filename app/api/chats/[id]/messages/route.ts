import { streamText, UIMessage } from 'ai';
import { aiModel } from '@/lib/ai-config';
import prisma from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: chatId } = await params;

    // Extract messages from the request
    const { messages }: { messages: UIMessage[] } = await request.json();

    console.log('=== MESSAGES COUNT ===', messages.length);

    if (messages.length === 0) {
      console.error('No messages in request');
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
      });
    }

    // Get the latest message
    const latestMessage = messages[messages.length - 1];
    console.log('=== LATEST MESSAGE ===');
    console.log(JSON.stringify(latestMessage, null, 2));

    // Simple conversion - just use content directly
    const simpleMessages = messages.map((msg: UIMessage) => ({
      role: msg.role,
      content: msg.parts
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join(''),
    }));

    console.log('=== SIMPLE MESSAGES FOR MODEL ===');
    console.log(JSON.stringify(simpleMessages, null, 2));

    // Stream the response with minimal config (like the test)
    const result = streamText({
      model: aiModel,
      messages: simpleMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('=== ERROR ===', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    );
  }
}
