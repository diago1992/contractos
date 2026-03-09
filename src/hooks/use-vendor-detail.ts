import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { VendorDetailData, Vendor, Contract, Invoice, Discussion } from '@/types/contracts';

export function useVendorDetail(vendorId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['vendor-detail', vendorId],
    enabled: !!vendorId,
    queryFn: async (): Promise<VendorDetailData> => {
      if (!vendorId) throw new Error('No vendor ID');

      // Fetch vendor
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('id', vendorId)
        .single();
      if (vendorError) throw vendorError;

      // Get contract IDs linked to this vendor
      const { data: contractVendors } = await supabase
        .from('contract_vendors')
        .select('contract_id')
        .eq('vendor_id', vendorId);

      const contractIds = contractVendors?.map(cv => cv.contract_id) ?? [];

      // Parallel fetch: contracts, invoices, discussions
      const [contractsResult, invoicesResult, discussionsResult] = await Promise.all([
        contractIds.length > 0
          ? supabase
              .from('contracts')
              .select('*')
              .in('id', contractIds)
              .is('deleted_at', null)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('invoices')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('invoice_date', { ascending: false }),
        supabase
          .from('discussions')
          .select('*')
          .eq('vendor_id', vendorId)
          .order('created_at', { ascending: true }),
      ]);

      return {
        vendor: vendor as Vendor,
        contracts: (contractsResult.data ?? []) as Contract[],
        invoices: (invoicesResult.data ?? []) as Invoice[],
        discussions: (discussionsResult.data ?? []) as Discussion[],
      };
    },
  });
}
