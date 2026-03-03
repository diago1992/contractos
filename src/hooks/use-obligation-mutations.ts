'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ObligationStatus, ContractWithRelations } from '@/types/contracts';

interface UpdateObligationStatusParams {
  obligationIds: string[];
  status: ObligationStatus;
  contractId: string;
}

export function useUpdateObligationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ obligationIds, status, contractId }: UpdateObligationStatusParams) => {
      const res = await fetch('/api/obligations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ obligationIds, status, contractId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to update obligations' }));
        throw new Error(data.error || 'Failed to update obligations');
      }
      return res.json();
    },
    onMutate: async ({ obligationIds, status, contractId }) => {
      // Cancel in-flight queries
      await queryClient.cancelQueries({ queryKey: ['contract', contractId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData<ContractWithRelations>(['contract', contractId]);

      // Optimistic update
      if (previous) {
        queryClient.setQueryData<ContractWithRelations>(['contract', contractId], {
          ...previous,
          obligations: previous.obligations.map((o) =>
            obligationIds.includes(o.id) ? { ...o, status } : o
          ),
        });
      }

      return { previous, contractId };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['contract', context.contractId], context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract', variables.contractId] });
    },
  });
}
