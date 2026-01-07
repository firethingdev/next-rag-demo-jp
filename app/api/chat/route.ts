import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStreamResponse, UIMessage } from 'ai';
import { aiModel } from '@/lib/ai-config';
import { searchSimilarChunks, formatContextForLLM } from '@/lib/vector-store';
import { SystemMessage } from '@langchain/core/messages';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // Extract messages and chatId from the request
    const { messages, id: chatId }: { messages: UIMessage[]; id?: string } =
      await request.json();

    console.log('=== MESSAGES COUNT ===', messages.length);
    console.log('=== CHAT ID ===', chatId);

    if (messages.length === 0) {
      console.error('No messages in request');
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
      });
    }

    // Convert AI SDK UIMessages to LangChain messages
    const langchainMessages = await toBaseMessages(messages);

    // If we have a chatId (or it's a general query), perform RAG if needed
    // Usually we use the last message as the query
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.parts
      .filter((p) => p.type === 'text')
      .map((p) => (p as { text: string }).text)
      .join(' ');

    if (query && chatId) {
      console.log('=== PERFORMING RAG SEARCH ===');
      const similarChunks = await searchSimilarChunks(query, chatId);
      const context = await formatContextForLLM(similarChunks);

      if (context) {
        console.log('=== CONTEXT RETRIEVED ===');
        // Prepend system message with context
        langchainMessages.unshift(new SystemMessage(context));
      }
    }

    // Stream the response from the model
    const stream = await aiModel.stream(langchainMessages);

    // Convert the LangChain stream to UI message stream and return response
    return createUIMessageStreamResponse({
      stream: toUIMessageStream(stream),
    });
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
