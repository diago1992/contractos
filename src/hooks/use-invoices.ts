'use client';

import { useQuery } from '@tanstack/react-query';
import type { Invoice } from '@/types/contracts';

export function useContractInvoices(contractId: string) {
  const query = useQuery<Invoice[]>({
    queryKey: ['contract-invoices', contractId],
    queryFn: async () => {
      // First get the vendor linked to this contract
      const vendorRes = await fetch(`/api/contracts/${contractId}/vendor`);
      if (!vendorRes.ok) return [];
      const vendor = await vendorRes.json();
      if (!vendor?.id) return [];

      // Then get invoices for that vendor
      const res = await fetch(`/api/vendors/${vendor.id}/invoices`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!contractId,
  });

  return {
    invoices: query.data ?? [],
    isLoading: query.isLoading,
  };
}

export function useContractSpend(contractId: string) {
  const { invoices } = useContractInvoices(contractId);
  const totalSpend = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  return { totalSpend };
}
