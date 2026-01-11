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
 * メッセージ数を含むすべてのチャットを取得
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
    console.error('チャット取得エラー:', error);
    throw new Error('チャットの取得に失敗しました');
  }
}

/**
 * 新しいチャットを作成
 */
export async function createChat(title?: string): Promise<Chat> {
  try {
    const chat = await prisma.chat.create({
      data: {
        title: title || '新しいチャット',
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
    console.error('チャット作成エラー:', error);
    throw new Error('チャットの作成に失敗しました');
  }
}

/**
 * メッセージを含む特定のチャットを取得
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
    console.error('チャット取得エラー:', error);
    throw new Error('チャットの取得に失敗しました');
  }
}

/**
 * チャットを削除
 */
export async function deleteChat(id: string): Promise<void> {
  try {
    await prisma.chat.delete({
      where: { id },
    });

    revalidatePath('/');
  } catch (error) {
    console.error('チャット削除エラー:', error);
    throw new Error('チャットの削除に失敗しました');
  }
}

/**
 * 最初のメッセージに基づいて、チャットのタイトル（日本語で3〜10文字程度）を生成
 */
export async function generateTitle(
  messages: { role: string; content: string }[],
): Promise<string> {
  try {
    const conversation = messages
      .map(
        (m) =>
          `${m.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${m.content}`,
      )
      .join('\n');

    const prompt = `以下の会話内容に基づいて、このチャットにふさわしい簡潔で分かりやすいタイトルを日本語で生成してください。
タイトルは10文字以内で、引用符や特殊記号は使用しないでください。

${conversation}`;

    const response = await aiModel.invoke([new HumanMessage(prompt)]);

    let title = response.content.toString().trim();
    // タイトルのクリーンアップ（引用符などを削除）
    title = title.replace(/['"]+/g, '');

    return title || '新しいチャット';
  } catch (error) {
    console.error('タイトル生成エラー:', error);
    return '新しいチャット';
  }
}

/**
 * 初期メッセージとともに新しいチャットを保存
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
    console.error('メッセージ付きチャット保存エラー:', error);
    throw new Error('チャットの保存に失敗しました');
  }
}

/**
 * 既存のチャットに単一のメッセージを保存
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
    console.error('メッセージ保存エラー:', error);
    throw new Error('メッセージの保存に失敗しました');
  }
}

/**
 * チャットのタイトルを更新
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
    console.error('チャットタイトル更新エラー:', error);
    throw new Error('チャットタイトルの更新に失敗しました');
  }
}
