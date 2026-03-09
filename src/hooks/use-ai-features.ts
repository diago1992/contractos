import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { EsgSearchResult, NewsItem } from '@/types/contracts';

export function useEsgSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { vendor_id: string; vendor_name: string }): Promise<EsgSearchResult> => {
      const res = await fetch('/api/ai/esg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('ESG search failed');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-detail', variables.vendor_id] });
    },
  });
}

export function useVendorNews() {
  return useMutation({
    mutationFn: async (vendorName: string): Promise<NewsItem[]> => {
      const res = await fetch('/api/ai/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_name: vendorName }),
      });
      if (!res.ok) throw new Error('News search failed');
      const data = await res.json();
      return data.articles ?? [];
    },
  });
}

export function useExtractTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string): Promise<{ count: number }> => {
      const res = await fetch('/api/ai/extract-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId }),
      });
      if (!res.ok) throw new Error('Term extraction failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-detail'] });
    },
  });
}

export function useExtractObligations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contractId: string): Promise<{ count: number }> => {
      const res = await fetch('/api/ai/extract-obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id: contractId }),
      });
      if (!res.ok) throw new Error('Obligation extraction failed');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-detail'] });
    },
  });
}

export function useVendorDescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendorId: string): Promise<{ description: string }> => {
      const res = await fetch('/api/ai/vendor-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      if (!res.ok) throw new Error('Description generation failed');
      return res.json();
    },
    onSuccess: (_, vendorId) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-detail', vendorId] });
    },
  });
}
