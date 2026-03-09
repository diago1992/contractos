import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Discussion } from '@/types/contracts';

export function useDiscussions(contractId?: string, vendorId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['discussions', contractId, vendorId],
    enabled: !!(contractId || vendorId),
    queryFn: async () => {
      let query = supabase
        .from('discussions')
        .select('*')
        .order('created_at', { ascending: true });

      if (contractId) query = query.eq('contract_id', contractId);
      if (vendorId) query = query.eq('vendor_id', vendorId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Discussion[];
    },
  });
}

export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { body: string; contract_id?: string; vendor_id?: string }) => {
      const res = await fetch('/api/discussions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create discussion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}

export function useDeleteDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/discussions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete discussion');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions'] });
    },
  });
}
