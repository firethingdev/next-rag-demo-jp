'use server';

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
  const apiKey =
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

  try {
    if (apiKey) {
      const response = await fetch(
        `${process.env.AI_GATEWAY_BASE_URL}/credits`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 60 }, // Cache for 1 minute
        },
      );

      if (response.ok) {
        const data = await response.json();
        credits = parseFloat(data.balance);
      } else {
        console.error(
          'Failed to fetch credits from AI Gateway:',
          response.statusText,
        );
      }
    }
  } catch (error) {
    console.error('Error fetching credits:', error);
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
