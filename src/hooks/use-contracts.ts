import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ContractListItem, ContractFilters, DashboardStats, Contract } from '@/types/contracts';

export function useContracts(filters: ContractFilters = {}, page = 1, pageSize = 20) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['contracts', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('id, title, counterparty_name, document_type, status, extraction_status, effective_date, expiry_date, created_at, file_name, cost_centre, annual_value, mm_owner, on_file, notice_deadline', { count: 'exact' })
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (filters.search) {
        query = query.textSearch('search_vector', filters.search, { type: 'websearch' });
      }
      if (filters.document_type) {
        query = query.eq('document_type', filters.document_type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.extraction_status) {
        query = query.eq('extraction_status', filters.extraction_status);
      }
      if (filters.cost_centre) {
        query = query.eq('cost_centre', filters.cost_centre);
      }
      if (filters.mm_owner) {
        query = query.eq('mm_owner', filters.mm_owner);
      }
      if (filters.on_file !== undefined) {
        query = query.eq('on_file', filters.on_file);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data as ContractListItem[],
        count: count ?? 0,
        page,
        page_size: pageSize,
      };
    },
  });
}

export function useAllContracts() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['all-contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Contract[];
    },
  });
}

export function useDashboardStats() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [active, pendingReview, expiringSoon, recentlyAdded, obligationsOverdue, noContractOnFile] = await Promise.all([
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active').is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'under_review').is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('expiry_date', now).lte('expiry_date', thirtyDaysFromNow).is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).is('deleted_at', null),
        supabase.from('obligations').select('id', { count: 'exact', head: true }).eq('status', 'overdue'),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('on_file', false).is('deleted_at', null),
      ]);

      return {
        total_active: active.count ?? 0,
        pending_review: pendingReview.count ?? 0,
        expiring_soon: expiringSoon.count ?? 0,
        recently_added: recentlyAdded.count ?? 0,
        renewal_action_required: expiringSoon.count ?? 0,
        obligations_overdue: obligationsOverdue.count ?? 0,
        no_contract_on_file: noContractOnFile.count ?? 0,
        spend_approaching_cap: 0,
      };
    },
  });
}
