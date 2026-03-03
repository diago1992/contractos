import { useMutation } from '@tanstack/react-query';

interface QuerySource {
  id: string;
  title: string;
  document_type: string | null;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  chunks_used: number;
}

export function useContractQuery() {
  return useMutation<QueryResponse, Error, string>({
    mutationFn: async (question: string) => {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Query failed' }));
        throw new Error(body.error || 'Query failed');
      }
      return res.json();
    },
  });
}
