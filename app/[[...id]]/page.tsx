import { ChatBox } from '@/components/chat-box';
import { getChat } from '@/lib/actions/chat.actions';
import { UIMessage } from 'ai';

interface PageProps {
  params: Promise<{ id?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const chatId = id?.[0] || null;

  let initialMessages: UIMessage[] = [];
  let title: string | undefined;

  if (chatId) {
    const chat = await getChat(chatId);
    if (chat) {
      title = chat.title;
      initialMessages = chat.messages.map((m) => ({
        id: m.id,
        role: m.role as UIMessage['role'],
        content: m.content,
        parts: [{ type: 'text', text: m.content }],
      }));
    }
  }

  return (
    <ChatBox
      key={chatId || 'new'}
      chatId={chatId}
      initialMessages={initialMessages}
      title={title}
    />
  );
}
