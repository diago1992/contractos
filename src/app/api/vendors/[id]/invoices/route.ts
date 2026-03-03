import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isNetSuiteConfigured } from '@/lib/netsuite/auth';
import { getVendorInvoices } from '@/lib/netsuite/vendors';

function mapNetSuiteStatus(status: string): 'open' | 'paid_in_full' | 'partially_paid' | 'overdue' | 'voided' | 'cancelled' {
  const s = status.toLowerCase();
  if (s.includes('paid in full') || s === 'paidfull') return 'paid_in_full';
  if (s.includes('partially') || s === 'partpaid') return 'partially_paid';
  if (s.includes('void')) return 'voided';
  if (s.includes('cancel')) return 'cancelled';
  return 'open';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: vendorId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get vendor to check netsuite_vendor_id
  const { data: vendor } = await admin
    .from('vendors')
    .select('netsuite_vendor_id')
    .eq('id', vendorId)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  // If NetSuite is configured and vendor is synced, pull from NetSuite
  if (isNetSuiteConfigured() && vendor.netsuite_vendor_id) {
    try {
      const nsInvoices = await getVendorInvoices(vendor.netsuite_vendor_id);

      // Upsert invoices
      for (const inv of nsInvoices) {
        await admin.from('invoices').upsert(
          {
            vendor_id: vendorId,
            netsuite_invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            amount: Number(inv.total),
            amount_paid: Number(inv.amountpaid ?? 0),
            amount_remaining: Number(inv.amountremaining ?? 0),
            currency: typeof inv.currency === 'string' ? inv.currency : 'AUD',
            status: mapNetSuiteStatus(typeof inv.status === 'string' ? inv.status : 'open'),
            invoice_date: inv.trandate ?? null,
            due_date: inv.duedate ?? null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'netsuite_invoice_id' }
        );
      }
    } catch (err) {
      console.error('Failed to sync invoices from NetSuite:', err);
    }
  }

  // Return all local invoices for this vendor
  const { data: invoices, error } = await admin
    .from('invoices')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('invoice_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(invoices);
}
