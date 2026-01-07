'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, MessageSquare } from 'lucide-react';

interface ChatInterfaceProps {
  chatId: string | null;
}

export function ChatInterface({ chatId }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    id: chatId || undefined,
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!chatId) {
    return (
      <div className='flex items-center justify-center h-full bg-muted/5'>
        <div className='text-center'>
          <MessageSquare className='w-16 h-16 mx-auto text-muted-foreground mb-4' />
          <h2 className='text-xl font-semibold mb-2'>No Chat Selected</h2>
          <p className='text-muted-foreground'>
            Select a chat from the sidebar or create a new one to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <ScrollArea className='flex-1 p-4' ref={scrollRef}>
        <div className='space-y-4 max-w-3xl mx-auto'>
          {messages.length === 0 ? (
            <div className='text-center text-muted-foreground py-12'>
              <Bot className='w-12 h-12 mx-auto mb-4 opacity-50' />
              <p>Start a conversation by sending a message below</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0'>
                    <Bot className='w-5 h-5 text-primary-foreground' />
                  </div>
                )}

                <Card
                  className={`p-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className='text-sm whitespace-pre-wrap'>
                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case 'text':
                          return (
                            <div key={`${message.id}-${i}`}>{part.text}</div>
                          );
                        default:
                          return null;
                      }
                    })}
                  </div>
                </Card>

                {message.role === 'user' && (
                  <div className='w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0'>
                    <User className='w-5 h-5 text-secondary-foreground' />
                  </div>
                )}
              </div>
            ))
          )}

          {isLoading && (
            <div className='flex gap-3'>
              <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0'>
                <Bot className='w-5 h-5 text-primary-foreground' />
              </div>
              <Card className='p-3 bg-muted'>
                <p className='text-sm text-muted-foreground'>Thinking...</p>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className='border-t p-4 bg-background'>
        <div className='max-w-3xl mx-auto'>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                sendMessage({ text: input });
                setInput('');
              }
            }}
          >
            <div className='flex gap-2'>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder='Type your message...'
                className='resize-none'
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      sendMessage({ text: input });
                      setInput('');
                    }
                  }
                }}
              />
              <Button
                type='submit'
                size='icon'
                disabled={isLoading || !input?.trim()}
              >
                <Send className='w-4 h-4' />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
