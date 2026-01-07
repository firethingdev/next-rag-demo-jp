'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Upload, File, Trash2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
} from '@/lib/actions/document.actions';

interface Document {
  id: string;
  filename: string;
  chatId: string | null;
  createdAt: Date;
  _count?: {
    embeddings: number;
  };
}

interface FileExplorerProps {
  chatId: string | null;
  refreshTrigger?: number;
}

export function FileExplorer({ chatId, refreshTrigger }: FileExplorerProps) {
  const [chatDocuments, setChatDocuments] = useState<Document[]>([]);
  const [globalDocuments, setGlobalDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      // Fetch all documents
      const allDocs = await getDocuments();

      // Separate chat-specific and global documents
      const chatDocs = allDocs.filter((doc) => doc.chatId === chatId);
      const globalDocs = allDocs.filter((doc) => doc.chatId === null);

      setChatDocuments(chatDocs);
      setGlobalDocuments(globalDocs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
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
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await deleteDocument(docId);
      await fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
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
                  onDelete={handleDeleteDocument}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <Separator />

      {/* Global documents */}
      <div className='flex-1 flex flex-col min-h-0'>
        <div className='p-3 bg-muted/30'>
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
            {globalDocuments.length === 0 ? (
              <p className='text-xs text-muted-foreground text-center py-4'>
                No global documents yet
              </p>
            ) : (
              globalDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  document={doc}
                  onDelete={handleDeleteDocument}
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
}: {
  document: Document;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className='p-2'>
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
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 shrink-0'
          onClick={() => onDelete(document.id)}
        >
          <Trash2 className='w-3 h-3' />
        </Button>
      </div>
    </Card>
  );
}
