'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getChats, createChat, deleteChat } from '@/lib/actions/chat.actions';

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    messages: number;
  };
}

interface ChatListProps {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onCreateChat: () => void;
  refreshTrigger?: number;
}

export function ChatList({
  selectedChatId,
  onSelectChat,
  onCreateChat,
  refreshTrigger,
}: ChatListProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, [refreshTrigger]);

  const fetchChats = async () => {
    try {
      const data = await getChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    try {
      const newChat = await createChat('New Chat');
      setChats([newChat, ...chats]);
      onCreateChat();
      onSelectChat(newChat.id);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      await deleteChat(chatId);
      setChats(chats.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        onSelectChat('');
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  return (
    <div className='flex flex-col h-full border-r bg-muted/10'>
      <div className='p-4 border-b'>
        <Button onClick={handleCreateChat} className='w-full' size='sm'>
          <Plus className='w-4 h-4 mr-2' />
          New Chat
        </Button>
      </div>

      <ScrollArea className='flex-1'>
        <div className='p-2 space-y-2'>
          {loading ? (
            <div className='text-center text-sm text-muted-foreground p-4'>
              Loading chats...
            </div>
          ) : chats.length === 0 ? (
            <div className='text-center text-sm text-muted-foreground p-4'>
              No chats yet. Create one to get started!
            </div>
          ) : (
            chats.map((chat) => (
              <Card
                key={chat.id}
                className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
                  selectedChatId === chat.id ? 'bg-accent border-primary' : ''
                }`}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className='flex items-start justify-between gap-2'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <MessageSquare className='w-4 h-4 text-muted-foreground shrink-0' />
                      <h3 className='font-medium text-sm truncate'>
                        {chat.title}
                      </h3>
                    </div>
                    <p className='text-xs text-muted-foreground mt-1'>
                      {chat._count?.messages || 0} messages •{' '}
                      {formatDistanceToNow(new Date(chat.updatedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 shrink-0'
                    onClick={(e) => handleDeleteChat(chat.id, e)}
                  >
                    <Trash2 className='w-3 h-3' />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
