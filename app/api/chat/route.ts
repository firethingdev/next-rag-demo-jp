import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStreamResponse, UIMessage } from 'ai';
import { runRagAgent } from '@/lib/agent';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Extract messages and chatId from the request
    const { messages, id: chatId }: { messages: UIMessage[]; id?: string } =
      await request.json();

    if (messages.length === 0) {
      console.error('No messages in request');
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
      });
    }

    // Convert AI SDK UIMessages to LangChain messages
    const langchainMessages = await toBaseMessages(messages);
    console.log('=== STARTING RAG AGENT ===');

    // Run the RAG agent process (History -> Query Transform -> Search -> Generate)
    const stream = await runRagAgent(langchainMessages, chatId);
    console.log('=== AGENT STREAM STARTED ===');

    // Convert the LangChain stream chunks back to UI message stream
    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
    });
  } catch (error) {
    console.error('=== CHAT API ERROR ===', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    );
  }
}
