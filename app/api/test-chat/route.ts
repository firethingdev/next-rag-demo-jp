import { streamText } from 'ai';
import { aiModel } from '@/lib/ai-config';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    console.log('Test message:', message);

    // Simple test with minimal configuration
    const result = streamText({
      model: aiModel,
      messages: [
        {
          role: 'user',
          content: message || 'Hello, how are you?',
        },
      ],
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Test error:', error);
    return new Response(
      JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    );
  }
}
