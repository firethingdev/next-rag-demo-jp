'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { aiModel } from '@/lib/ai-config';
import { HumanMessage } from '@langchain/core/messages';

export interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    messages: number;
  };
}

export interface ChatWithMessages extends Chat {
  messages: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }[];
}

/**
 * Fetch all chats with message counts
 */
export async function getChats(): Promise<Chat[]> {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return chats;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw new Error('Failed to fetch chats');
  }
}

/**
 * Create a new chat
 */
export async function createChat(title?: string): Promise<Chat> {
  try {
    const chat = await prisma.chat.create({
      data: {
        title: title || 'New Chat',
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    revalidatePath('/');
    return chat;
  } catch (error) {
    console.error('Error creating chat:', error);
    throw new Error('Failed to create chat');
  }
}

/**
 * Get a specific chat with messages
 */
export async function getChat(id: string): Promise<ChatWithMessages | null> {
  try {
    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    return chat;
  } catch (error) {
    console.error('Error fetching chat:', error);
    throw new Error('Failed to fetch chat');
  }
}

/**
 * Delete a chat
 */
export async function deleteChat(id: string): Promise<void> {
  try {
    await prisma.chat.delete({
      where: { id },
    });

    revalidatePath('/');
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw new Error('Failed to delete chat');
  }
}

/**
 * Generate a 3-5 word title for a chat based on its first messages
 */
export async function generateTitle(
  messages: { role: string; content: string }[],
): Promise<string> {
  try {
    const firstMessages = messages.slice(0, 2);
    const prompt = `Based on the following conversation, generate a concise, catchy 3-5 word title for this chat. Do not use quotes or special characters.

User: ${firstMessages[0]?.content}
Assistant: ${firstMessages[1]?.content}`;

    const response = await aiModel.invoke([new HumanMessage(prompt)]);

    let title = response.content.toString().trim();
    // Clean up title (remove quotes, etc.)
    title = title.replace(/['"]+/g, '');

    return title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    return 'New Chat';
  }
}

/**
 * Save a new chat with its initial messages
 */
export async function saveChatWithMessages(
  id: string,
  title: string,
  messages: { role: string; content: string }[],
): Promise<Chat> {
  try {
    const chat = await prisma.chat.create({
      data: {
        id,
        title,
        messages: {
          create: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        },
      },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    revalidatePath('/');
    return chat;
  } catch (error) {
    console.error('Error saving chat with messages:', error);
    throw new Error('Failed to save chat');
  }
}

/**
 * Save a single message to an existing chat
 */
export async function saveMessage(
  chatId: string,
  role: string,
  content: string,
): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.message.create({
        data: {
          chatId,
          role,
          content,
        },
      }),
      prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);

    revalidatePath('/');
  } catch (error) {
    console.error('Error saving message:', error);
    throw new Error('Failed to save message');
  }
}

/**
 * Update a chat's title
 */
export async function updateChatTitle(
  id: string,
  title: string,
): Promise<void> {
  try {
    await prisma.chat.update({
      where: { id },
      data: { title },
    });

    revalidatePath('/');
  } catch (error) {
    console.error('Error updating chat title:', error);
    throw new Error('Failed to update chat title');
  }
}
