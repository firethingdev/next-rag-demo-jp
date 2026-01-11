import prisma, { Prisma } from '@/lib/prisma';
import { AI_CONFIG, embeddings } from '@/lib/ai-config';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { Embedding } from '@/generated/prisma/client';

/**
 * PrismaVectorStoreの初期化
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
 * AI Gatewayを介したLangChainの埋め込みモデルを使用して、テキストのベクトルを生成
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embedding = await embeddings.embedQuery(text);
  return embedding;
}

/**
 * ドキュメントのチャンクと対応する埋め込みベクトルをデータベースに保存
 * @param documentId - 関連付けるドキュメントのID
 * @param chunks - ドキュメントから分割されたテキストチャンクの配列
 */
export async function storeEmbeddings(
  documentId: string,
  chunks: string[],
): Promise<void> {
  // 最初にベクトルなしでEmbeddingレコードを作成
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

  // addModelsを使用してベクトルを生成・保存
  await vectorStore.addModels(embeddingModels);
}

/**
 * ベクトル類似度を使用して類似したドキュメントチャンクを検索
 * @param query - 検索クエリテキスト
 * @param chatId - 検索対象のチャットID（グローバルドキュメントも含まれます）
 * @param topK - 返す結果の数（デフォルトはAI_CONFIGから取得）
 */
export async function searchSimilarChunks(
  query: string,
  chatId: string,
  topK: number = AI_CONFIG.topK,
) {
  // まず、このチャットに属するドキュメントのIDを取得
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

  // PrismaVectorStoreのsimilaritySearchを使用して類似チャンクを検索
  // 取得したドキュメントIDでフィルタリング
  const results = await vectorStore.similaritySearch(query, topK, {
    documentId: {
      in: docIds,
    },
  });

  // 結果を期待されるフォーマットに変換
  return results.map((result) => {
    const embedding = result.metadata as unknown as Embedding;
    return {
      id: embedding.id,
      chunkText: embedding.chunkText,
      chunkIndex: embedding.chunkIndex,
      documentId: embedding.documentId,
      filename: filenameMap[embedding.documentId] || '不明',
      similarity: 1, // PrismaVectorStoreのsimilaritySearchは結果にスコアを直接含みません
    };
  });
}

/**
 * 取得したチャンクをLLM用のコンテキスト形式に整形
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

  // コンテキストのフォーマット
  const contextParts = [
    'ユーザーのドキュメントから抽出された関連情報は以下の通りです：',
    '',
  ];

  for (const [filename, docChunks] of Object.entries(chunksByDocument)) {
    contextParts.push(`## 出典: ${filename}`);
    contextParts.push('');

    // ドキュメントの順序を維持するためにインデックスでソート
    const sortedChunks = docChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    for (const chunk of sortedChunks) {
      contextParts.push(chunk.chunkText);
      contextParts.push('');
    }

    contextParts.push('---');
    contextParts.push('');
  }

  contextParts.push(
    'これらの情報を使用してユーザーの質問に答えてください。情報が質問に関連しない場合は、無視して構いません。',
  );

  return contextParts.join('\n');
}
