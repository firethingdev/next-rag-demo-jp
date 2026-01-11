'use server';

import { gatewayApiKey, gatewayBaseURL } from '../ai-config';
import { getTotalFileSize } from './document.actions';

export interface UsageState {
  credits: number;
  totalBytes: number;
  isCreditLimitReached: boolean;
  isStorageLimitReached: boolean;
  isLimitReached: boolean;
}

export async function getUsageState(): Promise<UsageState> {
  let credits = 0;

  try {
    if (gatewayApiKey) {
      const response = await fetch(`${gatewayBaseURL}/credits`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gatewayApiKey}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 60 }, // Cache for 1 minute
      });

      if (response.ok) {
        const data = await response.json();
        credits = parseFloat(data.balance);
      } else {
        console.error(
          'AI Gatewayからのクレジット取得に失敗しました:',
          response.statusText,
        );
      }
    }
  } catch (error) {
    console.error('クレジット取得エラー:', error);
  }

  const totalBytes = await getTotalFileSize();
  const isCreditLimitReached = credits < 3;
  const isStorageLimitReached = totalBytes > 200 * 1024 * 1024;

  return {
    credits,
    totalBytes,
    isCreditLimitReached,
    isStorageLimitReached,
    isLimitReached: isCreditLimitReached || isStorageLimitReached,
  };
}
