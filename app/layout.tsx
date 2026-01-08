import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { ChatListWrapper } from '@/components/chat-list-wrapper';
import { KnowledgeBaseWrapper } from '@/components/knowledge-base-wrapper';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Next RAG Demo',
  description:
    'A demo application of retrieval augmented generation using Next.js, AI SDK and LangChain',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className='h-screen w-screen overflow-hidden bg-background'>
          <div className='grid grid-cols-[300px_1fr_350px] h-full'>
            {/* Left Column: Chat List */}
            <ChatListWrapper />

            {/* Middle Column: Chat Interface (from page.tsx) */}
            <main className='h-full overflow-hidden'>{children}</main>

            {/* Right Column: File Explorer */}
            <KnowledgeBaseWrapper />
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
