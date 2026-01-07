import prisma from '@/lib/prisma';
import { AI_CONFIG, embeddings } from '@/lib/ai-config';
import crypto from 'crypto';

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
  // Generate embeddings for all chunks
  const embeddingsData = await Promise.all(
    chunks.map(async (chunk, index) => {
      const embedding = await generateEmbedding(chunk);
      return {
        documentId,
        chunkText: chunk,
        chunkIndex: index,
        embedding: `[${embedding.join(',')}]`, // PostgreSQL vector format
      };
    }),
  );

  // Store all embeddings in the database using $executeRawUnsafe for batch insert
  // We use this because $executeRaw with template literals doesn't support dynamic VALUES clauses
  const values = embeddingsData
    .map(
      (data) => `(
      '${crypto.randomUUID()}',
      '${data.documentId.replace(/'/g, "''")}',
      '${data.chunkText.replace(/'/g, "''")}',
      ${data.chunkIndex},
      '${data.embedding}'::vector,
      NOW()
    )`,
    )
    .join(', ');

  await prisma.$executeRawUnsafe(`
    INSERT INTO embeddings (id, "documentId", "chunkText", "chunkIndex", embedding, "createdAt")
    VALUES ${values}
  `);
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
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Convert the embedding array to a PostgreSQL vector format
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // Search for similar chunks using pgvector's cosine similarity
  // We search in both chat-specific documents and global documents (chatId = null)
  const results = await prisma.$queryRaw<
    Array<{
      id: string;
      chunkText: string;
      chunkIndex: number;
      documentId: string;
      filename: string;
      similarity: number;
    }>
  >`
    SELECT
      e.id,
      e."chunkText",
      e."chunkIndex",
      e."documentId",
      d.filename,
      1 - (e.embedding <=> ${vectorString}::vector) as similarity
    FROM embeddings e
    JOIN documents d ON e."documentId" = d.id
    WHERE d."chatId" = ${chatId} OR d."chatId" IS NULL
    ORDER BY e.embedding <=> ${vectorString}::vector
    LIMIT ${topK}
  `;

  return results;
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
