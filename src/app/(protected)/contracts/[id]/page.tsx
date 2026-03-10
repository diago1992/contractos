import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // Find the vendor linked to this contract (limit 1 for multi-vendor contracts)
  const { data: cv } = await supabase
    .from('contract_vendors')
    .select('vendor_id')
    .eq('contract_id', id)
    .limit(1)
    .maybeSingle();

  if (cv?.vendor_id) {
    redirect(`/counterparties/${cv.vendor_id}`);
  }

  // No vendor linked — redirect to contracts list
  redirect('/contracts');
}
