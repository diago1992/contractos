import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ContractWithRelations } from '@/types/contracts';

export function useContractDetail(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['contract', id],
    queryFn: async (): Promise<ContractWithRelations> => {
      const { data: contract, error } = await supabase
        .from('contracts')
        .select(`
          *,
          commercial_terms (*),
          obligations (*),
          risk_flags (*),
          contract_tags (*),
          audit_log (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Fetch links separately
      const { data: links } = await supabase
        .from('contract_links')
        .select('*')
        .or(`parent_contract_id.eq.${id},child_contract_id.eq.${id}`);

      const row = contract as Record<string, unknown>;

      return {
        ...row,
        commercial_terms: (row.commercial_terms as unknown[]) ?? [],
        obligations: (row.obligations as unknown[]) ?? [],
        risk_flags: (row.risk_flags as unknown[]) ?? [],
        tags: (row.contract_tags as unknown[]) ?? [],
        links: links ?? [],
        audit_log: (row.audit_log as unknown[]) ?? [],
      } as unknown as ContractWithRelations;
    },
    enabled: !!id,
  });
}
