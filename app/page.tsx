'use client';

import { useState } from 'react';
import { ChatList } from '@/components/chat-list';
import { ChatBox } from '@/components/chat-box';
import { KnowledgeBase } from '@/components/knowledge-base';

export default function Home() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateChat = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className='h-screen w-screen overflow-hidden bg-background'>
      <div className='grid grid-cols-[300px_1fr_350px] h-full'>
        {/* Left Column: Chat List */}
        <ChatList
          selectedChatId={selectedChatId}
          onSelectChat={setSelectedChatId}
          onCreateChat={handleCreateChat}
          refreshTrigger={refreshTrigger}
        />

        {/* Middle Column: Chat Interface */}
        <ChatBox chatId={selectedChatId} />

        {/* Right Column: File Explorer */}
        <KnowledgeBase
          chatId={selectedChatId}
          refreshTrigger={refreshTrigger}
        />
      </div>
    </div>
  );
}
