'use client';

import { useQuery } from '@tanstack/react-query';
import type { AnalyticsData } from '@/types/analytics';

export function useAnalytics() {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
