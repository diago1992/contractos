import { useQuery } from '@tanstack/react-query';

export interface SemanticSearchResult {
  chunk_id: string;
  contract_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  contract: {
    id: string;
    title: string;
    counterparty_name: string | null;
    document_type: string | null;
    status: string;
    expiry_date: string | null;
    file_name: string;
  } | null;
}

interface SemanticSearchResponse {
  results: SemanticSearchResult[];
  contracts: { id: string; title: string }[];
  query: string;
}

export function useSemanticSearch(query: string, enabled = true) {
  return useQuery<SemanticSearchResponse>({
    queryKey: ['semantic-search', query],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query, limit: '20' });
      const res = await fetch(`/api/search?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Search failed' }));
        throw new Error(body.error || 'Search failed');
      }
      return res.json();
    },
    enabled: enabled && query.trim().length >= 3,
    staleTime: 60_000,
  });
}
