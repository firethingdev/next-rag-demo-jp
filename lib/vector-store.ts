import prisma, { Prisma } from '@/lib/prisma';
import { AI_CONFIG, embeddings } from '@/lib/ai-config';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { Embedding } from '@/generated/prisma/client';

/**
 * Initialize the PrismaVectorStore
 */
const vectorStore = PrismaVectorStore.withModel<Embedding>(prisma).create(
  embeddings,
  {
    prisma: Prisma,
    tableName: 'embeddings' as unknown as 'Embedding',
    vectorColumnName: 'embedding',
    columns: {
      id: PrismaVectorStore.IdColumn,
      chunkText: PrismaVectorStore.ContentColumn,
    },
  },
);

/**
 * Generate embeddings for a given text using LangChain OpenAI embeddings via AI Gateway
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding = await embeddings.embedQuery(text);
  return embedding;
}

/**
 * Store embeddings for document chunks in the database
 * @param documentId - The document ID to associate embeddings with
 * @param chunks - Array of text chunks from the document
 */
export async function storeEmbeddings(
  documentId: string,
  chunks: string[],
): Promise<void> {
  // First, create the Embedding records without the vectors
  // We do this so we can then use addModels to update them with vectors
  const embeddingModels = await prisma.$transaction(
    chunks.map((chunk, index) =>
      prisma.embedding.create({
        data: {
          documentId,
          chunkText: chunk,
          chunkIndex: index,
        },
      }),
    ),
  );

  // Use addModels to generate and store embeddings
  await vectorStore.addModels(embeddingModels);
}

/**
 * Search for similar document chunks using vector similarity
 * @param query - The search query text
 * @param chatId - The chat ID to search within (also includes global documents)
 * @param topK - Number of results to return (default from AI_CONFIG)
 */
export async function searchSimilarChunks(
  query: string,
  chatId: string,
  topK: number = AI_CONFIG.topK,
) {
  // First, get the IDs of documents that belong to this chat
  const docs = await prisma.document.findMany({
    where: {
      chats: {
        some: { chatId },
      },
    },
    select: { id: true, filename: true },
  });
  const docIds = docs.map((d) => d.id);
  const filenameMap = Object.fromEntries(docs.map((d) => [d.id, d.filename]));

  // Search for similar chunks using PrismaVectorStore's similaritySearch
  // We filter by the document IDs we found
  const results = await vectorStore.similaritySearch(query, topK, {
    documentId: {
      in: docIds,
    },
  });

  // Map results back to the expected format
  return results.map((result) => {
    const embedding = result.metadata as unknown as Embedding;
    return {
      id: embedding.id,
      chunkText: embedding.chunkText,
      chunkIndex: embedding.chunkIndex,
      documentId: embedding.documentId,
      filename: filenameMap[embedding.documentId] || 'Unknown',
      similarity: 1, // PrismaVectorStore doesn't return scores in similaritySearch result directly
    };
  });
}

/**
 * Format retrieved chunks into context for the LLM
 */
export async function formatContextForLLM(
  chunks: Array<{
    id: string;
    chunkText: string;
    chunkIndex: number;
    documentId: string;
    filename: string;
    similarity: number;
  }>,
): Promise<string> {
  if (chunks.length === 0) {
    return '';
  }

  // Group chunks by document
  const chunksByDocument = chunks.reduce(
    (acc, chunk) => {
      if (!acc[chunk.filename]) {
        acc[chunk.filename] = [];
      }
      acc[chunk.filename].push(chunk);
      return acc;
    },
    {} as Record<string, typeof chunks>,
  );

  // Format the context
  const contextParts = [
    "You have access to the following relevant information from the user's documents:",
    '',
  ];

  for (const [filename, docChunks] of Object.entries(chunksByDocument)) {
    contextParts.push(`## From: ${filename}`);
    contextParts.push('');

    // Sort chunks by index to maintain document order
    const sortedChunks = docChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    for (const chunk of sortedChunks) {
      contextParts.push(chunk.chunkText);
      contextParts.push('');
    }

    contextParts.push('---');
    contextParts.push('');
  }

  contextParts.push(
    "Please use this information to answer the user's question. If the information is not relevant, you can ignore it.",
  );

  return contextParts.join('\n');
}
