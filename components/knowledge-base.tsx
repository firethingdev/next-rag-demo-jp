'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
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
import { Upload, File, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  addDocumentToChat,
  removeDocumentFromChat,
} from '@/lib/actions/document.actions';
import { useUsage } from '@/components/usage-context';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  filename: string;
  createdAt: Date;
  url?: string | null;
  _count?: {
    embeddings: number;
  };
}

interface KnowledgeBaseProps {
  refreshTrigger?: number;
}

export function KnowledgeBase({ refreshTrigger }: KnowledgeBaseProps) {
  const params = useParams();
  const chatId = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  const [chatDocuments, setChatDocuments] = useState<Document[]>([]);
  const [globalDocuments, setGlobalDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const { isLimitReached } = useUsage();

  const fetchDocuments = useCallback(async () => {
    try {
      // Fetch all documents (Global)
      const allDocs = await getDocuments();
      setGlobalDocuments(allDocs);

      // Fetch documents for this chat
      if (chatId) {
        const chatDocs = await getDocuments(chatId);
        setChatDocuments(chatDocs);
      } else {
        setChatDocuments([]);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to fetch documents');
    }
  }, [chatId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshTrigger]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchDocuments();
    };
    window.addEventListener('knowledge-base-updated', handleUpdate);
    window.addEventListener('chat-updated', handleUpdate);
    return () => {
      window.removeEventListener('knowledge-base-updated', handleUpdate);
      window.removeEventListener('chat-updated', handleUpdate);
    };
  }, [fetchDocuments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Single file upload size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await uploadDocument(formData);
      await fetchDocuments();
      window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload file',
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(docId);
      await fetchDocuments();
      window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
      toast.success('Document deleted from global library');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const toggleDocumentInChat = async (docId: string, isInChat: boolean) => {
    if (!chatId) {
      toast.error('Select a chat first');
      return;
    }

    try {
      if (isInChat) {
        await removeDocumentFromChat(docId, chatId);
        toast.success('Removed from chat');
      } else {
        await addDocumentToChat(docId, chatId);
        toast.success('Added to chat');
      }
      await fetchDocuments();
      window.dispatchEvent(new CustomEvent('knowledge-base-updated'));
    } catch (error) {
      console.error('Failed to update document status:', error);
      toast.error('Failed to update document status');
    }
  };

  return (
    <div className='flex flex-col h-full border-l bg-muted/10'>
      <div className='p-4 border-b flex items-center justify-between'>
        <h2 className='font-semibold text-sm'>Knowledge Base</h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <label>
              <input
                type='file'
                className='hidden'
                accept='.txt,.md,.json,.pdf'
                onChange={handleFileUpload}
                disabled={uploading || isLimitReached}
              />
              <Button
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 text-xs',
                  (uploading || isLimitReached) &&
                    'opacity-50 cursor-not-allowed',
                )}
                asChild
              >
                <span
                  className={cn(
                    uploading || isLimitReached
                      ? 'pointer-events-none'
                      : 'cursor-pointer',
                  )}
                >
                  {uploading ? (
                    <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                  ) : (
                    <Upload className='w-3 h-3 mr-1' />
                  )}
                  Upload
                </span>
              </Button>
            </label>
          </TooltipTrigger>
          {isLimitReached && (
            <TooltipContent side='bottom'>
              Usage limit reached so chatting and file uploading are disabled.
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      <ScrollArea className='flex-1'>
        <div className='p-4 space-y-4'>
          {globalDocuments.length === 0 ? (
            <div className='text-center py-12'>
              <File className='w-8 h-8 text-muted-foreground/20 mx-auto mb-2' />
              <p className='text-xs text-muted-foreground'>
                No documents in knowledge base
              </p>
            </div>
          ) : (
            globalDocuments.map((doc) => {
              const isInChat = chatDocuments.some((cd) => cd.id === doc.id);
              return (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  isInChat={isInChat}
                  chatId={chatId}
                  onToggle={() => toggleDocumentInChat(doc.id, isInChat)}
                  onDelete={() => handleDeleteDocument(doc.id)}
                />
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DocumentItem({
  document,
  isInChat,
  chatId,
  onToggle,
  onDelete,
}: {
  document: Document;
  isInChat: boolean;
  chatId: string | null;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className={`p-3 transition-all ${isInChat ? 'border-primary/50 bg-primary/2' : 'hover:bg-muted/50'}`}
    >
      <div className='flex items-start gap-3'>
        <div className='flex items-center h-5 mt-0.5'>
          <input
            type='checkbox'
            checked={isInChat}
            onChange={onToggle}
            disabled={!chatId}
            className='h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed'
          />
        </div>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2 min-w-0'>
              <File className='w-4 h-4 text-muted-foreground shrink-0' />
              {document.url ? (
                <a
                  href={document.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs font-medium truncate hover:underline hover:text-primary cursor-pointer'
                >
                  {document.filename}
                </a>
              ) : (
                <span className='text-xs font-medium truncate'>
                  {document.filename}
                </span>
              )}
            </div>

            <div className='flex items-center gap-1 shrink-0'>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-6 w-6 text-muted-foreground hover:text-destructive'
                    title='Delete from global library'
                  >
                    <Trash2 className='w-3 h-3' />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will PERMANENTLY delete &quot;{document.filename}
                      &quot; and all its embeddings.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className='flex items-center gap-2 mt-1.5'>
            <Badge
              variant='secondary'
              className='text-[10px] h-4 px-1 font-normal opacity-70'
            >
              {document._count?.embeddings || 0} chunks
            </Badge>
            <span className='text-[10px] text-muted-foreground opacity-70'>
              {formatDistanceToNow(new Date(document.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
