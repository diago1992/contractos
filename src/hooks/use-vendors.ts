'use client';

import { useQuery } from '@tanstack/react-query';
import type { Vendor } from '@/types/contracts';

export function useVendors(search?: string) {
  return useQuery<Vendor[]>({
    queryKey: ['vendors', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/api/vendors${params}`);
      if (!res.ok) throw new Error('Failed to fetch vendors');
      return res.json();
    },
  });
}

export function useVendor(id: string) {
  return useQuery<Vendor>({
    queryKey: ['vendor', id],
    queryFn: async () => {
      const res = await fetch(`/api/vendors/${id}`);
      if (!res.ok) throw new Error('Failed to fetch vendor');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useContractVendor(contractId: string) {
  const query = useQuery<Vendor | null>({
    queryKey: ['contract-vendor', contractId],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${contractId}/vendor`);
      if (!res.ok) throw new Error('Failed to fetch contract vendor');
      return res.json();
    },
    enabled: !!contractId,
  });

  return {
    vendor: query.data ?? null,
    isLoading: query.isLoading,
  };
}
