import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isNetSuiteConfigured } from '@/lib/netsuite/auth';
import { getVendorInvoices } from '@/lib/netsuite/vendors';
import { publishNotificationToAllUsers } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isNetSuiteConfigured()) {
    return NextResponse.json({ message: 'NetSuite not configured, skipping' });
  }

  const admin = createAdminClient();

  // Get all synced vendors
  const { data: vendors } = await admin
    .from('vendors')
    .select('id, netsuite_vendor_id')
    .eq('sync_status', 'synced')
    .not('netsuite_vendor_id', 'is', null);

  if (!vendors || vendors.length === 0) {
    return NextResponse.json({ message: 'No synced vendors', synced: 0 });
  }

  let totalSynced = 0;

  for (const vendor of vendors) {
    if (!vendor.netsuite_vendor_id) continue;

    try {
      const nsInvoices = await getVendorInvoices(vendor.netsuite_vendor_id);

      for (const inv of nsInvoices) {
        const status = (() => {
          const s = (typeof inv.status === 'string' ? inv.status : '').toLowerCase();
          if (s.includes('paid in full') || s === 'paidfull') return 'paid_in_full' as const;
          if (s.includes('partially') || s === 'partpaid') return 'partially_paid' as const;
          if (s.includes('void')) return 'voided' as const;
          if (s.includes('cancel')) return 'cancelled' as const;
          return 'open' as const;
        })();

        await admin.from('invoices').upsert(
          {
            vendor_id: vendor.id,
            netsuite_invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            amount: Number(inv.total),
            amount_paid: Number(inv.amountpaid ?? 0),
            amount_remaining: Number(inv.amountremaining ?? 0),
            currency: typeof inv.currency === 'string' ? inv.currency : 'AUD',
            status,
            invoice_date: inv.trandate ?? null,
            due_date: inv.duedate ?? null,
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'netsuite_invoice_id' }
        );
      }

      totalSynced++;
    } catch (err) {
      console.error(`Failed to sync invoices for vendor ${vendor.id}:`, err);
    }
  }

  // Check spend thresholds for all contracts with linked vendors
  const { data: contractVendors } = await admin
    .from('contract_vendors')
    .select('contract_id, vendor_id');

  if (contractVendors) {
    for (const cv of contractVendors) {
      // Get contract value
      const { data: terms } = await admin
        .from('commercial_terms')
        .select('amount')
        .eq('contract_id', cv.contract_id);

      const contractValue = (terms ?? []).reduce((sum, t) => sum + (t.amount ? Number(t.amount) : 0), 0);
      if (contractValue <= 0) continue;

      // Get total invoiced
      const { data: invoices } = await admin
        .from('invoices')
        .select('amount')
        .eq('vendor_id', cv.vendor_id);

      const totalInvoiced = (invoices ?? []).reduce((sum, i) => sum + Number(i.amount), 0);
      const ratio = totalInvoiced / contractValue;

      // Get contract title for notification
      const { data: contract } = await admin
        .from('contracts')
        .select('title')
        .eq('id', cv.contract_id)
        .single();

      const title = contract?.title ?? 'Unknown Contract';

      if (ratio >= 1.0) {
        await publishNotificationToAllUsers({
          contractId: cv.contract_id,
          type: 'spend_threshold_exceeded',
          message: `Spend on "${title}" has exceeded 100% of contract value ($${totalInvoiced.toLocaleString()} / $${contractValue.toLocaleString()})`,
        });
      } else if (ratio >= 0.8) {
        await publishNotificationToAllUsers({
          contractId: cv.contract_id,
          type: 'spend_threshold_warning',
          message: `Spend on "${title}" has reached ${Math.round(ratio * 100)}% of contract value ($${totalInvoiced.toLocaleString()} / $${contractValue.toLocaleString()})`,
        });
      }
    }
  }

  return NextResponse.json({ message: 'Invoice sync complete', synced: totalSynced });
}
