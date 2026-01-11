import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { AppLayout } from '@/components/app-layout';
import { UsageProvider } from '@/components/usage-context';
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
  title: 'Next RAG デモ',
  description:
    'Next.js、AI SDK、LangChainを使用した、検索拡張生成（RAG）のデモアプリケーション',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ja' suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UsageProvider>
          <AppLayout>{children}</AppLayout>
        </UsageProvider>
        <Toaster />
      </body>
    </html>
  );
}
