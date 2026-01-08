'use client';

import { useChat } from '@ai-sdk/react';
import { UIMessage } from 'ai';
import { MemoizedMarkdown } from '@/components/memoized-markdown';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Send, Bot, User, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  saveMessage,
  generateTitle,
  updateChatTitle,
} from '@/lib/actions/chat.actions';

interface ChatBoxProps {
  chatId: string | null;
  initialMessages?: UIMessage[];
  title?: string;
}

export function ChatBox({
  chatId,
  initialMessages = [],
  title: initialTitle,
}: ChatBoxProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const router = useRouter();

  // Update currentTitle if initialTitle changes (e.g. on navigation)
  useEffect(() => {
    setCurrentTitle(initialTitle);
  }, [initialTitle]);

  const { messages, sendMessage, status } = useChat({
    id: chatId || undefined,
    messages: initialMessages,
    onFinish: async ({ message, messages: latestMessages }) => {
      if (!chatId) return;

      const assistantContent = (message.parts || [])
        .filter((part) => part.type === 'text')
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join('');

      // Persist assistant message
      await saveMessage(chatId, 'assistant', assistantContent);

      // If this was the first round (1 user + 1 assistant), generate title
      if (latestMessages.length === 2) {
        const userContent = (latestMessages[0].parts || [])
          .filter((part) => part.type === 'text')
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join('');

        const titleMessages = [
          { role: latestMessages[0].role, content: userContent },
          { role: message.role, content: assistantContent },
        ];
        const title = await generateTitle(titleMessages);
        await updateChatTitle(chatId, title);

        // Update local state and notify
        setCurrentTitle(title);
        router.refresh();
        window.dispatchEvent(new CustomEvent('chat-updated'));
      }
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !chatId) return;

    const currentInput = input;
    setInput('');

    // Persist user message immediately
    await saveMessage(chatId, 'user', currentInput);

    // Send to AI SDK
    sendMessage({ text: currentInput });
  };

  if (!chatId) {
    return (
      <div className='flex items-center justify-center h-full bg-muted/5'>
        <div className='text-center'>
          <MessageSquare className='w-16 h-16 mx-auto text-muted-foreground mb-4 font-thin' />
          <h2 className='text-xl font-semibold mb-2'>No Chat Selected</h2>
          <p className='text-muted-foreground'>
            Select a chat from the sidebar or create a new one to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-screen bg-background'>
      <div className='sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b bg-background/80 backdrop-blur-md'>
        <div className='flex items-center gap-3'>
          <div className='p-2 rounded-lg bg-primary/10 text-primary'>
            <MessageSquare className='w-4 h-4' />
          </div>
          <h1 className='font-semibold text-lg truncate max-w-[200px] sm:max-w-[400px]'>
            {currentTitle || 'New Conversation'}
          </h1>
        </div>
      </div>

      <div className='space-y-4 max-w-3xl mx-auto overflow-y-auto grow p-4'>
        {messages.length === 0 ? (
          <div className='text-center text-muted-foreground py-12'>
            <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border/50'>
              <Bot className='w-8 h-8 opacity-50' />
            </div>
            <p className='text-lg font-medium text-foreground/80 mb-1'>
              New Conversation
            </p>
            <p className='text-sm opacity-70'>How can I help you today?</p>
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
                <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm'>
                  <Bot className='w-5 h-5 text-primary-foreground' />
                </div>
              )}

              <Card
                className={`p-4 shadow-sm border-none ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/80 backdrop-blur-sm'
                }`}
                style={{
                  borderRadius:
                    message.role === 'user'
                      ? '1.25rem 1.25rem 0.25rem 1.25rem'
                      : '1.25rem 1.25rem 1.25rem 0.25rem',
                }}
              >
                <div
                  className={`text-sm leading-relaxed ${
                    message.role === 'assistant'
                      ? 'prose prose-sm dark:prose-invert max-w-none'
                      : 'whitespace-pre-wrap'
                  }`}
                >
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <MemoizedMarkdown
                            id={message.id}
                            key={`${message.id}-${i}`}
                            content={part.text}
                          />
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </Card>

              {message.role === 'user' && (
                <div className='w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-sm'>
                  <User className='w-5 h-5 text-secondary-foreground' />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className='flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300'>
            <div className='w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-sm'>
              <Bot className='w-5 h-5 text-primary-foreground' />
            </div>
            <Card
              className='p-4 bg-muted/80 backdrop-blur-sm border-none'
              style={{ borderRadius: '1.25rem 1.25rem 1.25rem 0.25rem' }}
            >
              <div className='flex gap-1.5 py-1 px-0.5'>
                <div
                  className='w-1.5 h-1.5 rounded-full bg-foreground/20 animate-bounce'
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className='w-1.5 h-1.5 rounded-full bg-foreground/20 animate-bounce'
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className='w-1.5 h-1.5 rounded-full bg-foreground/20 animate-bounce'
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className='p-4 border-t bg-background/50 backdrop-blur-md'>
        <div className='max-w-3xl mx-auto'>
          <form
            onSubmit={handleSendMessage}
            className='relative flex items-end gap-2 bg-muted/50 rounded-2xl p-2 pr-3 border border-border/50 focus-within:border-primary/30 transition-colors'
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Type your message...'
              className='resize-none border-none bg-transparent focus-visible:ring-0 min-h-[44px] max-h-48 py-2.5'
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              style={{ height: 'auto' }}
            />
            <Button
              type='submit'
              size='icon'
              className='shrink-0 rounded-xl mb-0.5 h-9 w-9'
              disabled={isLoading || !input?.trim() || !chatId}
            >
              <Send className='w-4 p-0.5' />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
