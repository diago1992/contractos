import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isNetSuiteConfigured } from '@/lib/netsuite/auth';
import { createVendorInNetSuite, getVendor } from '@/lib/netsuite/vendors';
import type { Vendor } from '@/types/contracts';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isNetSuiteConfigured()) {
    return NextResponse.json({ error: 'NetSuite is not configured' }, { status: 503 });
  }

  const admin = createAdminClient();

  // Check role
  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'reviewer' && userData.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get vendor
  const { data: vendorRow, error: vendorError } = await admin
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (vendorError || !vendorRow) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const vendor = vendorRow as unknown as Vendor;

  // Mark as syncing
  await admin.from('vendors').update({ sync_status: 'syncing', sync_error: null }).eq('id', id);

  const body = await request.json().catch(() => ({}));
  const { netsuiteVendorId } = body as { netsuiteVendorId?: string };

  try {
    if (netsuiteVendorId) {
      // Link to existing NetSuite vendor
      const nsVendor = await getVendor(netsuiteVendorId);
      await admin.from('vendors').update({
        netsuite_vendor_id: netsuiteVendorId,
        netsuite_entity_id: nsVendor.entityId ?? null,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }).eq('id', id);
    } else {
      // Create new vendor in NetSuite
      const result = await createVendorInNetSuite({
        companyName: vendor.name,
        email: vendor.email ?? undefined,
        phone: vendor.phone ?? undefined,
        addressLine1: vendor.address ?? undefined,
        taxIdNum: vendor.tax_id ?? undefined,
      });

      await admin.from('vendors').update({
        netsuite_vendor_id: result.id,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      }).eq('id', id);
    }

    // Fetch updated vendor
    const { data: updated } = await admin
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await admin.from('vendors').update({
      sync_status: 'error',
      sync_error: message,
    }).eq('id', id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
