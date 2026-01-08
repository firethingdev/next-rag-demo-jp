'use client';

import { useParams } from 'next/navigation';
import { KnowledgeBase } from './knowledge-base';

export function KnowledgeBaseWrapper() {
  const params = useParams();
  const id = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : null;

  return <KnowledgeBase chatId={id} />;
}
