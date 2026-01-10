'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { getUsageState, UsageState } from '@/lib/actions/usage.actions';

interface UsageContextType extends UsageState {
  refreshUsage: () => Promise<void>;
  isLoading: boolean;
}

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UsageState>({
    credits: 100,
    totalBytes: 0,
    isCreditLimitReached: false,
    isStorageLimitReached: false,
    isLimitReached: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshUsage = useCallback(async () => {
    setIsLoading(true);
    try {
      const newState = await getUsageState();
      setState(newState);
    } catch (error) {
      console.error('Failed to refresh usage state:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsage();

    // Refresh usage on specific events
    const handleUpdate = () => refreshUsage();
    window.addEventListener('knowledge-base-updated', handleUpdate);
    window.addEventListener('chat-updated', handleUpdate);

    return () => {
      window.removeEventListener('knowledge-base-updated', handleUpdate);
      window.removeEventListener('chat-updated', handleUpdate);
    };
  }, [refreshUsage]);

  return (
    <UsageContext.Provider value={{ ...state, refreshUsage, isLoading }}>
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}
