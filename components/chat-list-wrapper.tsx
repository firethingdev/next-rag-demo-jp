'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChatList } from './chat-list';

export function ChatListWrapper() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const handleSelectChat = (chatId: string) => {
    router.push(`/${chatId}`);
  };

  return <ChatList selectedChatId={id} onSelectChat={handleSelectChat} />;
}
