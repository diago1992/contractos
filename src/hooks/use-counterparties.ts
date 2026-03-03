import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface CounterpartyGroup {
  counterparty_name: string;
  contracts: {
    id: string;
    title: string;
    document_type: string | null;
    status: string;
    expiry_date: string | null;
    effective_date: string | null;
  }[];
}

export function useCounterparties(search?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['counterparties', search],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('id, title, counterparty_name, document_type, status, expiry_date, effective_date')
        .not('counterparty_name', 'is', null)
        .is('deleted_at', null)
        .order('counterparty_name', { ascending: true })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('counterparty_name', `%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by counterparty_name
      const groups = new Map<string, CounterpartyGroup>();
      for (const contract of data ?? []) {
        const name = contract.counterparty_name!;
        if (!groups.has(name)) {
          groups.set(name, { counterparty_name: name, contracts: [] });
        }
        groups.get(name)!.contracts.push({
          id: contract.id,
          title: contract.title,
          document_type: contract.document_type,
          status: contract.status,
          expiry_date: contract.expiry_date,
          effective_date: contract.effective_date,
        });
      }

      return Array.from(groups.values());
    },
  });
}
