'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { Upload, Plus, Minus, File, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  addDocumentToChat,
  removeDocumentFromChat,
} from '@/lib/actions/document.actions';

interface Document {
  id: string;
  filename: string;
  createdAt: Date;
  _count?: {
    embeddings: number;
  };
}

interface KnowledgeBaseProps {
  chatId: string | null;
  refreshTrigger?: number;
}

export function KnowledgeBase({ chatId, refreshTrigger }: KnowledgeBaseProps) {
  const [chatDocuments, setChatDocuments] = useState<Document[]>([]);
  const [globalDocuments, setGlobalDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isGlobal: boolean,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (!isGlobal && chatId) {
        formData.append('chatId', chatId);
      }

      await uploadDocument(formData);

      await fetchDocuments();
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(docId);
      await fetchDocuments();
      toast.success('Document deleted from global library');
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleAddToChat = async (docId: string) => {
    if (!chatId) return;
    try {
      await addDocumentToChat(docId, chatId);
      await fetchDocuments();
      toast.success('Document added to chat');
    } catch (error) {
      console.error('Failed to add document to chat:', error);
      toast.error('Failed to add document to chat');
    }
  };

  const handleRemoveFromChat = async (docId: string) => {
    if (!chatId) return;
    try {
      await removeDocumentFromChat(docId, chatId);
      await fetchDocuments();
      toast.success('Document removed from chat');
    } catch (error) {
      console.error('Failed to remove document from chat:', error);
      toast.error('Failed to remove document from chat');
    }
  };

  return (
    <div className='flex flex-col h-full border-l bg-muted/10'>
      <div className='p-4 border-b'>
        <h2 className='font-semibold text-sm'>Knowledge Base</h2>
      </div>

      {/* Chat-specific documents */}
      <div className='flex-1 flex flex-col min-h-0'>
        <div className='p-3 bg-muted/30'>
          <div className='flex items-center justify-between mb-2'>
            <h3 className='text-xs font-medium text-muted-foreground uppercase'>
              Current Chat
            </h3>
            {chatId && (
              <label>
                <input
                  type='file'
                  className='hidden'
                  accept='.txt,.md,.json'
                  onChange={(e) => handleFileUpload(e, false)}
                  disabled={uploading}
                />
                <Button
                  size='sm'
                  variant='outline'
                  className='h-7 text-xs'
                  asChild
                >
                  <span>
                    {uploading ? (
                      <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                    ) : (
                      <Upload className='w-3 h-3 mr-1' />
                    )}
                    Upload
                  </span>
                </Button>
              </label>
            )}
          </div>
        </div>

        <ScrollArea className='flex-1'>
          <div className='p-2 space-y-2'>
            {!chatId ? (
              <p className='text-xs text-muted-foreground text-center py-4'>
                Select a chat to view its documents
              </p>
            ) : chatDocuments.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-4'>
                No documents in this chat
              </p>
            ) : (
              chatDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onRemove={() => handleRemoveFromChat(doc.id)}
                  isInChat={true}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Global documents */}
      <div className='flex flex-col h-1/2 min-h-0'>
        <div className='p-3 bg-muted/30 border-t'>
          <div className='flex items-center justify-between mb-2'>
            <h3 className='text-xs font-medium text-muted-foreground uppercase'>
              Global Files
            </h3>
            <label>
              <input
                type='file'
                className='hidden'
                accept='.txt,.md,.json'
                onChange={(e) => handleFileUpload(e, true)}
                disabled={uploading}
              />
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs'
                asChild
              >
                <span>
                  {uploading ? (
                    <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                  ) : (
                    <Upload className='w-3 h-3 mr-1' />
                  )}
                  Upload
                </span>
              </Button>
            </label>
          </div>
        </div>

        <ScrollArea className='flex-1'>
          <div className='p-2 space-y-2'>
            {globalDocuments.filter(
              (doc) => !chatDocuments.some((cd) => cd.id === doc.id),
            ).length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-4'>
                No global documents yet
              </p>
            ) : (
              globalDocuments
                .filter((doc) => !chatDocuments.some((cd) => cd.id === doc.id))
                .map((doc) => (
                  <DocumentItem
                    key={doc.id}
                    document={doc}
                    onDelete={() => handleDeleteDocument(doc.id)}
                    onAdd={() => handleAddToChat(doc.id)}
                    showAddButton={!!chatId}
                  />
                ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function DocumentItem({
  document,
  onDelete,
  onAdd,
  onRemove,
  isInChat,
  showAddButton,
}: {
  document: Document;
  onDelete?: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  isInChat?: boolean;
  showAddButton?: boolean;
}) {
  return (
    <Card className={`p-2 ${isInChat ? 'border-primary/50 bg-primary/5' : ''}`}>
      <div className='flex items-start gap-2'>
        <File className='w-4 h-4 text-muted-foreground shrink-0 mt-0.5' />
        <div className='flex-1 min-w-0'>
          <p className='text-xs font-medium truncate'>{document.filename}</p>
          <div className='flex items-center gap-2 mt-1'>
            <Badge variant='secondary' className='text-[10px] h-4 px-1'>
              {document._count?.embeddings || 0} chunks
            </Badge>
            <span className='text-[10px] text-muted-foreground'>
              {formatDistanceToNow(new Date(document.createdAt), {
                addSuffix: true,
              })}
            </span>
          </div>
        </div>
        <div className='flex items-center gap-1'>
          {showAddButton && (
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 shrink-0'
              onClick={onAdd}
              title='Add to current chat'
            >
              <Plus className='w-3 h-3' />
            </Button>
          )}
          {onRemove && (
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 shrink-0'
              onClick={onRemove}
              title='Remove from current chat'
            >
              <Minus className='w-3 h-3' />
            </Button>
          )}
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-6 w-6 shrink-0'
                  title='Delete from global library'
                >
                  <Trash2 className='w-3 h-3 text-destructive' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will PERMANENTLY delete &quot;{document.filename}&quot;
                    from the global library and ALL chats that reference it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    Delete Everywhere
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  );
}
