import { aiModel } from '@/lib/ai-config';
import { searchSimilarChunks, formatContextForLLM } from '@/lib/vector-store';
import {
  createAgent,
  dynamicSystemPromptMiddleware,
  summarizationMiddleware,
} from 'langchain';
import {
  SystemMessage,
  BaseMessage,
  AIMessageChunk,
} from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';

// Initialize a checkpointer for short-term memory
const checkpointer = new MemorySaver();

/**
 * Get the RAG agent instance with the 4-step logic and short-term memory
 */
export function getRagAgent(chatId?: string) {
  return createAgent({
    name: 'Grounded RAG Agent',
    model: aiModel,
    tools: [],
    checkpointer,
    middleware: [
      // 1. History Management: Automatically summarize long conversations
      summarizationMiddleware({
        model: aiModel, // Using the same model for summarization
        trigger: { messages: 12 }, // Summarize after 12 messages
        keep: { messages: 4 }, // Keep the last 4 messages and a summary
      }),
      dynamicSystemPromptMiddleware(async (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        const queryText = lastMessage.content.toString();

        // 2. Query Transformation: Summarize request into a standalone question
        let standaloneQuery = queryText;
        if (state.messages.length > 1) {
          console.log('=== TRANSFORMING QUERY ===');
          const transformRes = await aiModel.invoke([
            new SystemMessage(
              'Given the conversation history, rephrase the latest user message into a standalone search query. Keep it brief and focused on the core information needed.',
            ),
            ...state.messages.slice(-3),
          ]);
          standaloneQuery = transformRes.content.toString();
          console.log('Standalone Query:', standaloneQuery);
        }

        // 3. Search Docs & put results in context
        let context = '';
        if (chatId && standaloneQuery.trim().length > 0) {
          console.log('=== PERFORMING RAG SEARCH ===');
          const similarChunks = await searchSimilarChunks(
            standaloneQuery,
            chatId,
          );
          context = await formatContextForLLM(similarChunks);
        }

        // 4. Final Instruction: Professional, grounded, but helpful and welcoming
        console.log('=== CREATING SYSTEM PROMPT ===');
        return new SystemMessage(`
          You are a friendly and professional assistant. Your primary goal is to help users find information within the provided context.

          GUIDELINES:
          1. GREETINGS: Always respond to greetings (e.g., "Hi", "Hello") in a warm and welcoming manner. You don't need context for these.
          2. GROUNDING: For factual questions, use ONLY the provided context. Do not make up information or use outside knowledge.
          3. MISSING INFORMATION: If the context doesn't contain the answer, politely inform the user. Instead of a rigid error message, you can say something like: "I've looked through the documents, but I couldn't find specific information about [Topic]. I'm happy to help you with other questions about the provided materials!"
          4. TONE: Maintain a helpful, polite, and encouraging tone throughout the conversation.
          5. PRIVACY: Do NOT mention the search query transformation process, standalone queries, or the RAG process in your response. Just provide the final answer directly to the user.

          CONTEXT:
          ${context || 'No relevant document snippets were found for this specific query.'}
        `);
      }),
    ],
  });
}

/**
 * Run the RAG agent process
 */
export async function runRagAgent(messages: BaseMessage[], chatId?: string) {
  const agent = getRagAgent(chatId);

  console.log('=== RUNNING RAG AGENT ===');
  console.log('LANGSMITH_TRACING:', process.env.LANGSMITH_TRACING);

  // We use the chatId as the threadId for short-term memory persistence
  const threadId = chatId || 'default-thread';

  return agent.stream(
    { messages },
    {
      streamMode: ['messages', 'values'],
      configurable: { thread_id: threadId },
    },
  );
}
