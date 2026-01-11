'use server';

import prisma, { Prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { processDocument, extractTextFromFile } from '@/lib/document-processor';
import { storeEmbeddings } from '@/lib/vector-store';
import { put, del } from '@vercel/blob';

export interface Document {
  id: string;
  filename: string;
  url?: string | null;
  createdAt: Date;
  _count?: {
    embeddings: number;
  };
}

export interface DocumentMetadata {
  size?: number;
  type?: string;
  url?: string;
  [key: string]: unknown;
}

/**
 * ドキュメントを取得
 * @param chatId - 指定された場合、そのチャットに関連付けられたドキュメントを返します。
 *                指定されない場合は、すべてのドキュメント（グローバル）を返します。
 */
export async function getDocuments(
  chatId?: string | null,
): Promise<Document[]> {
  try {
    const where: Prisma.DocumentWhereInput = {};

    if (chatId) {
      where.chats = {
        some: { chatId },
      };
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    return documents as Document[];
  } catch (error) {
    console.error('ドキュメント取得エラー:', error);
    throw new Error('ドキュメントの取得に失敗しました');
  }
}

/**
 * ドキュメントのアップロードと処理
 */
export async function uploadDocument(formData: FormData): Promise<Document> {
  try {
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string | null;

    if (!file) {
      throw new Error('ファイルが提供されていません');
    }

    // 単一ファイルのアップロード制限: 10MB
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('ファイルサイズが10MBの制限を超えています');
    }

    // 処理前に利用制限を確認
    const totalBytes = await getTotalFileSize();
    if (totalBytes + file.size > 200 * 1024 * 1024) {
      throw new Error('ストレージ容量の上限（200MB）に達しました');
    }

    // ファイル内容の抽出
    const content = await extractTextFromFile(file);

    // Vercel Blobへアップロード
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // ドキュメントの処理（チャンク分割）
    const processed = await processDocument(file.name, content, {
      size: file.size,
      type: file.type,
      url: blob.url,
    });

    // データベースにドキュメントを保存
    const document = await prisma.document.create({
      data: {
        filename: processed.filename,
        content: processed.content,
        url: blob.url,
        metadata: (processed.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        chats: chatId
          ? {
              create: { chatId },
            }
          : undefined,
      },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    // 埋め込みベクトルの生成と保存
    await storeEmbeddings(document.id, processed.chunks);

    revalidatePath('/');
    return document as Document;
  } catch (error) {
    console.error('ドキュメントアップロードエラー:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('ドキュメントのアップロードに失敗しました');
  }
}

/**
 * すべてのドキュメントの合計ファイルサイズを取得
 */
export async function getTotalFileSize(): Promise<number> {
  try {
    const documents = await prisma.document.findMany({
      select: { metadata: true },
    });

    let totalSize = 0;
    for (const doc of documents) {
      if (
        doc.metadata &&
        typeof doc.metadata === 'object' &&
        !Array.isArray(doc.metadata)
      ) {
        const metadata = doc.metadata as DocumentMetadata;
        if (typeof metadata.size === 'number') {
          totalSize += metadata.size;
        }
      }
    }
    return totalSize;
  } catch (error) {
    console.error('合計ファイルサイズ計算エラー:', error);
    return 0;
  }
}

/**
 * ドキュメントを削除
 */
export async function deleteDocument(id: string): Promise<void> {
  try {
    const document = await prisma.document.findUnique({
      where: { id },
      select: { url: true },
    });

    if (document?.url) {
      await del(document.url);
    }

    await prisma.document.delete({
      where: { id },
    });

    revalidatePath('/');
  } catch (error) {
    console.error('ドキュメント削除エラー:', error);
    throw new Error('ドキュメントの削除に失敗しました');
  }
}

/**
 * ドキュメントをチャットに追加（参照作成）
 */
export async function addDocumentToChat(
  id: string,
  chatId: string,
): Promise<Document> {
  try {
    const document = await prisma.document.update({
      where: { id },
      data: {
        chats: {
          create: { chatId },
        },
      },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    revalidatePath('/');
    return document as Document;
  } catch (error) {
    console.error('ドキュメント追加エラー:', error);
    throw new Error('チャットへのドキュメント追加に失敗しました');
  }
}

/**
 * ドキュメントをチャットから削除（参照削除）
 */
export async function removeDocumentFromChat(
  id: string,
  chatId: string,
): Promise<Document> {
  try {
    const document = await prisma.document.update({
      where: { id },
      data: {
        chats: {
          delete: {
            chatId_documentId: {
              chatId,
              documentId: id,
            },
          },
        },
      },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
    });

    revalidatePath('/');
    return document as Document;
  } catch (error) {
    console.error('ドキュメント解除エラー:', error);
    throw new Error('チャットからのドキュメント解除に失敗しました');
  }
}
