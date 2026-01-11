'use client';

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
} from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { Loader } from '@/components/ai-elements/loader';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import {
  Bot,
  MessageSquare,
  Edit2,
  RefreshCw,
  Check,
  X,
  Upload,
  Loader2,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import {
  saveMessage,
  generateTitle,
  updateChatTitle,
} from '@/lib/actions/chat.actions';
import { uploadDocument } from '@/lib/actions/document.actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/app-layout';
import { useUsage } from '@/components/usage-context';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [currentTitle, setCurrentTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(initialTitle || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [input, setInput] = useState('');
  const router = useRouter();
  const { leftOpen, rightOpen, toggleLeft, toggleRight } = useSidebar();
  const { isCreditLimitReached, isLimitReached } = useUsage();

  // Update currentTitle if initialTitle changes (e.g. on navigation)
  useEffect(() => {
    setCurrentTitle(initialTitle);
    setEditTitleValue(initialTitle || '');
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
      // We check messages from the hook instead of the argument if options is problematic
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

  const handleSendMessage = async (message: { text: string }) => {
    if (!message.text.trim() || !chatId) return;

    // Clear input immediately as per common UI pattern
    setInput('');

    // Persist user message immediately
    await saveMessage(chatId, 'user', message.text);

    // Send to AI SDK
    sendMessage({ text: message.text });
  };

  const handleTitleUpdate = async () => {
    if (!chatId || !editTitleValue.trim() || editTitleValue === currentTitle) {
      setIsEditingTitle(false);
      setEditTitleValue(currentTitle || '');
      return;
    }

    try {
      await updateChatTitle(chatId, editTitleValue);
      setCurrentTitle(editTitleValue);
      setIsEditingTitle(false);
      router.refresh();
      window.dispatchEvent(new CustomEvent('chat-updated'));
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleRegenerateTitle = async () => {
    if (!chatId || messages.length < 2 || isRegenerating) return;

    setIsRegenerating(true);
    try {
      const titleMessages = messages.map((m: UIMessage) => ({
        role: m.role,
        content: (m.parts || [])
          .filter((part) => part.type === 'text')
          .map((part) => (part.type === 'text' ? part.text : ''))
          .join(''),
      }));

      const newTitle = await generateTitle(titleMessages);
      await updateChatTitle(chatId, newTitle);
      setCurrentTitle(newTitle);
      setEditTitleValue(newTitle);
      router.refresh();
      window.dispatchEvent(new CustomEvent('chat-updated'));
    } catch (error) {
      console.error('Failed to regenerate title:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDocumentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !chatId) return;

    // Single file upload size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('ファイルサイズが10MBの制限を超えています');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      await uploadDocument(formData);
      router.refresh();
      window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
      toast.success('ドキュメントをアップロードしました');
    } catch (error) {
      console.error('ドキュメントのアップロードに失敗しました:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'ドキュメントのアップロードに失敗しました',
      );
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (!chatId) {
    return (
      <div className='flex items-center justify-center h-full bg-muted/5'>
        <div className='text-center'>
          <MessageSquare className='w-16 h-16 mx-auto text-muted-foreground mb-4 font-thin' />
          <h2 className='text-xl font-semibold mb-2'>
            チャットが選択されていません
          </h2>
          <p className='text-muted-foreground'>
            サイドバーからチャットを選択するか、新しく作成して始めましょう
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col h-screen bg-background'>
      <div className='sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-md'>
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <Button
            variant='ghost'
            size='icon'
            onClick={toggleLeft}
            className={cn(
              'h-8 w-8 shrink-0',
              !leftOpen && 'text-primary bg-primary/10',
            )}
          >
            <PanelLeft className='w-4 h-4' />
          </Button>

          {isEditingTitle ? (
            <div className='flex items-center gap-2 flex-1 max-w-md'>
              <Input
                value={editTitleValue}
                onChange={(e) => setEditTitleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleUpdate();
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setEditTitleValue(currentTitle || '');
                  }
                }}
                className='h-8'
                autoFocus
              />
              <Button
                size='icon'
                variant='ghost'
                className='h-8 w-8 text-green-600 shrink-0'
                onClick={handleTitleUpdate}
              >
                <Check className='w-4 h-4' />
              </Button>
              <Button
                size='icon'
                variant='ghost'
                className='h-8 w-8 text-red-600 shrink-0'
                onClick={() => {
                  setIsEditingTitle(false);
                  setEditTitleValue(currentTitle || '');
                }}
              >
                <X className='w-4 h-4' />
              </Button>
            </div>
          ) : (
            <div className='flex items-center gap-1 overflow-hidden group'>
              <h1
                className='font-semibold text-sm sm:text-base truncate cursor-pointer hover:text-primary transition-colors'
                onClick={() => setIsEditingTitle(true)}
              >
                {currentTitle || '新しいチャット'}
              </h1>
              <Button
                size='icon'
                variant='ghost'
                className='h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hidden sm:flex'
                onClick={() => setIsEditingTitle(true)}
              >
                <Edit2 className='w-3 h-3' />
              </Button>
            </div>
          )}
        </div>

        <div className='flex items-center gap-1 sm:gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleRegenerateTitle}
            disabled={isRegenerating || messages.length < 2}
            className='h-8 px-2 text-[10px] sm:text-xs'
          >
            <RefreshCw
              className={cn(
                'w-3 h-3 sm:mr-2',
                isRegenerating && 'animate-spin',
              )}
            />
            <span className='hidden sm:inline'>
              {isRegenerating ? '生成中...' : 'タイトルを再生成'}
            </span>
          </Button>
          <Button
            size='icon'
            variant='ghost'
            className='h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 hidden sm:flex'
            onClick={() => router.push('/')}
            title='チャットを閉じる'
          >
            <X className='w-4 h-4' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            onClick={toggleRight}
            className={cn(
              'h-8 w-8 shrink-0',
              !rightOpen && 'text-primary bg-primary/10',
            )}
          >
            <PanelRight className='w-4 h-4' />
          </Button>
        </div>
      </div>

      <div className='flex flex-col h-full overflow-hidden'>
        <Conversation className='h-full'>
          <ConversationContent className='p-4'>
            {messages.length === 0 && (
              <div className='text-center text-muted-foreground py-12'>
                <div className='w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 border border-border/50'>
                  <Bot className='w-8 h-8 opacity-50' />
                </div>
                <p className='text-lg font-medium text-foreground/80 mb-1'>
                  新しい対話
                </p>
                <p className='text-sm opacity-70'>
                  今日はどのようにお手伝いしましょうか？
                </p>
              </div>
            )}
            {messages.map((message: UIMessage) => (
              <div key={message.id}>
                {message.parts.map((part, i) => {
                  switch (part.type) {
                    case 'text':
                      return (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <MessageResponse>{part.text}</MessageResponse>
                          </MessageContent>
                        </Message>
                      );
                    default:
                      return null;
                  }
                })}
              </div>
            ))}
            {(status === 'submitted' || status === 'streaming') && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        <div className='w-full'>
          <PromptInput
            onSubmit={handleSendMessage}
            className='border border-border/50 transition-colors'
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder={
                  isCreditLimitReached
                    ? '利用制限に達しました...'
                    : 'メッセージを入力...'
                }
                onChange={(e) => setInput(e.target.value)}
                value={input}
                disabled={isCreditLimitReached}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <label
                      className={cn(
                        'cursor-pointer',
                        (isUploading || isLimitReached) &&
                          'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <input
                        type='file'
                        className='hidden'
                        accept='.txt,.md,.json,.pdf'
                        onChange={handleDocumentUpload}
                        disabled={isUploading || isLimitReached}
                      />
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                          (isUploading || isLimitReached) &&
                            'pointer-events-none',
                        )}
                      >
                        {isUploading ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Upload className='h-4 w-4' />
                        )}
                      </div>
                    </label>
                  </TooltipTrigger>
                  {isLimitReached && (
                    <TooltipContent side='top'>
                      利用制限に達したため、チャット機能とファイルのアップロードが無効になっています。
                    </TooltipContent>
                  )}
                </Tooltip>
              </PromptInputTools>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <PromptInputSubmit
                      disabled={
                        !input.trim() ||
                        status === 'submitted' ||
                        status === 'streaming' ||
                        isCreditLimitReached
                      }
                      status={status}
                    />
                  </span>
                </TooltipTrigger>
                {isCreditLimitReached && (
                  <TooltipContent side='top'>
                    利用制限に達したため、チャット機能とファイルのアップロードが無効になっています。
                  </TooltipContent>
                )}
              </Tooltip>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
