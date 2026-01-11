import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

export interface ProcessedDocument {
  filename: string;
  content: string;
  chunks: string[];
  metadata?: Record<string, unknown>;
}

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '。', '、', ' ', ''],
});

/**
 * ドキュメントを処理してチャンクに分割
 */
export async function processDocument(
  filename: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<ProcessedDocument> {
  // ドキュメントをチャンクに分割
  const chunks = await textSplitter.splitText(content);

  return {
    filename,
    content,
    chunks,
    metadata,
  };
}

/**
 * ファイルからテキストを抽出
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    const loader = new PDFLoader(file);
    const docs = await loader.load();
    return docs.map((doc) => doc.pageContent).join('\n');
  }

  // テキスト形式として読み込む（.txt, .mdなどに対応）
  return await file.text();
}
