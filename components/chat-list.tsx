'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
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
  refreshTrigger?: number;
}

export function ChatList({ refreshTrigger }: ChatListProps) {
  const params = useParams();
  const router = useRouter();
  const selectedChatId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  const onSelectChat = (chatId: string) => {
    router.push(`/${chatId}`);
  };

  useEffect(() => {
    fetchChats();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchChats();
    };
    window.addEventListener('chat-updated', handleUpdate);
    return () => window.removeEventListener('chat-updated', handleUpdate);
  }, []);

  const fetchChats = async () => {
    try {
      const data = await getChats();
      setChats(data);
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      toast.error('Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChat = async () => {
    try {
      const newChat = await createChat('New Chat');
      setChats((prev) => [newChat, ...prev]);
      onSelectChat(newChat.id);
      toast.success('Chat created');
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats(chats.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        onSelectChat('');
      }
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  return (
    <div className='flex flex-col h-screen border-r bg-muted/10'>
      <div className='p-4 border-b'>
        <Button onClick={handleCreateChat} className='w-full' size='sm'>
          <Plus className='w-4 h-4 mr-2' />
          New Chat
        </Button>
      </div>

      <div className='p-2 space-y-2 h-full overflow-y-auto'>
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-6 w-6 shrink-0'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className='w-3 h-3' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the chat &quot;{chat.title}&quot; and all its
                        messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteChat(chat.id)}
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
