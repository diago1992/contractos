"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface EnrichedLink {
  id: string;
  link_type: string | null;
  direction: 'parent' | 'child';
  related_contract_id: string;
  related_contract_title: string;
  created_at: string;
}

export function useContractLinks(contractId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['contract-links', contractId];

  const { data: links = [], isLoading } = useQuery<EnrichedLink[]>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/links`);
      if (!res.ok) throw new Error('Failed to fetch links');
      return res.json();
    },
    enabled: !!contractId,
  });

  const createLink = useMutation({
    mutationFn: async (params: {
      targetContractId: string;
      linkType: string;
      direction: 'parent' | 'child';
    }) => {
      const res = await fetch(`/api/contracts/${contractId}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to create link' }));
        throw new Error(data.error || 'Failed to create link');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const res = await fetch(`/api/contracts/${contractId}/links?linkId=${linkId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to delete link' }));
        throw new Error(data.error || 'Failed to delete link');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    links,
    isLoading,
    createLink: createLink.mutate,
    deleteLink: deleteLink.mutate,
    isCreating: createLink.isPending,
  };
}
