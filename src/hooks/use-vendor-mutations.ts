'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      tax_id?: string;
    }) => {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create vendor' }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useLinkVendor(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      const res = await fetch(`/api/contracts/${contractId}/vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to link vendor' }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-vendor', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
    },
  });
}

export function useUnlinkVendor(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string) => {
      const res = await fetch(`/api/contracts/${contractId}/vendor?vendorId=${vendorId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to unlink vendor' }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-vendor', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
    },
  });
}

export function useSyncVendorToNetSuite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vendorId, netsuiteVendorId }: { vendorId: string; netsuiteVendorId?: string }) => {
      const res = await fetch(`/api/vendors/${vendorId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ netsuiteVendorId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Sync failed' }));
        throw new Error(err.error);
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}
