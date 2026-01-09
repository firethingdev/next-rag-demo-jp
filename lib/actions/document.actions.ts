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

/**
 * Fetch documents
 * @param chatId - If provided, returns documents connected to this chat.
 *                If 'global', returns all global documents (not connected to any chat - wait, the request says ALL docs are global).
 *                Actually, let's make it:
 *                - if chatId is provided: return documents connected to that chat.
 *                - if chatId is null/undefined: return all documents (since they are all global).
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
    console.error('Error fetching documents:', error);
    throw new Error('Failed to fetch documents');
  }
}

/**
 * Upload and process a document
 */
export async function uploadDocument(formData: FormData): Promise<Document> {
  try {
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string | null;

    if (!file) {
      throw new Error('No file provided');
    }

    // Read file content
    const content = await extractTextFromFile(file);

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Process document (chunk it)
    const processed = await processDocument(file.name, content, {
      size: file.size,
      type: file.type,
      url: blob.url,
    });

    // Store document in database
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

    // Generate and store embeddings
    await storeEmbeddings(document.id, processed.chunks);

    revalidatePath('/');
    return document as Document;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw new Error('Failed to upload document');
  }
}

/**
 * Delete a document
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
    console.error('Error deleting document:', error);
    throw new Error('Failed to delete document');
  }
}

/**
 * Add document to chat (create reference)
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
    console.error('Error adding document to chat:', error);
    throw new Error('Failed to add document to chat');
  }
}

/**
 * Remove document from chat (delete reference)
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
    console.error('Error removing document from chat:', error);
    throw new Error('Failed to remove document from chat');
  }
}
