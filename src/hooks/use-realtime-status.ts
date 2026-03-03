import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeStatus(contractId?: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();
  // Stable unique id for dashboard-level subscriptions to avoid channel name collisions
  const channelIdRef = useRef(
    contractId || `dashboard-${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    const channel = supabase
      .channel(`contract-${channelIdRef.current}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contracts',
          ...(contractId ? { filter: `id=eq.${contractId}` } : {}),
        },
        (payload) => {
          // Invalidate relevant queries
          if (contractId) {
            queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
          }
          queryClient.invalidateQueries({ queryKey: ['contracts'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contractId, queryClient, supabase]);
}
