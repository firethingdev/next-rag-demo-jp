'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { ChatList } from '@/components/chat-list';
import { KnowledgeBase } from '@/components/knowledge-base';
import { cn } from '@/lib/utils';

interface SidebarContextType {
  leftOpen: boolean;
  rightOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  leftOpen: true,
  rightOpen: true,
  toggleLeft: () => {},
  toggleRight: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setLeftOpen(false);
        setRightOpen(false);
      } else {
        setLeftOpen(true);
        setRightOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLeft = () => setLeftOpen(!leftOpen);
  const toggleRight = () => setRightOpen(!rightOpen);

  return (
    <SidebarContext.Provider
      value={{ leftOpen, rightOpen, toggleLeft, toggleRight }}
    >
      <div className='flex h-screen w-screen overflow-hidden bg-background'>
        {/* Left Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[300px] border-r bg-background transition-all duration-300 ease-in-out lg:relative overflow-hidden',
            leftOpen
              ? 'translate-x-0 lg:w-[300px]'
              : '-translate-x-full lg:w-0 lg:border-none',
          )}
        >
          <div className='w-[300px] h-full'>
            <ChatList />
          </div>
        </aside>

        {/* Main Content */}
        <main className='relative flex flex-1 flex-col overflow-hidden'>
          {children}
        </main>

        {/* Right Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 right-0 z-40 w-[350px] border-l bg-background transition-all duration-300 ease-in-out lg:relative overflow-hidden',
            rightOpen
              ? 'translate-x-0 lg:w-[350px]'
              : 'translate-x-full lg:w-0 lg:border-none',
          )}
        >
          <div className='w-[350px] h-full'>
            <KnowledgeBase />
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {isMobile && (leftOpen || rightOpen) && (
          <div
            className='fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300'
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        )}
      </div>
    </SidebarContext.Provider>
  );
}
