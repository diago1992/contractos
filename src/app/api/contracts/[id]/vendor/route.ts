import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get the linked vendor via contract_vendors join
  const { data: link } = await admin
    .from('contract_vendors')
    .select('vendor_id')
    .eq('contract_id', contractId)
    .limit(1)
    .single();

  if (!link) {
    return NextResponse.json(null);
  }

  const { data: vendor } = await admin
    .from('vendors')
    .select('*')
    .eq('id', link.vendor_id)
    .single();

  return NextResponse.json(vendor);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'reviewer' && userData.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { vendorId } = body as { vendorId: string };

  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('contract_vendors')
    .insert({ contract_id: contractId, vendor_id: vendorId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Vendor already linked' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await admin.from('audit_log').insert({
    contract_id: contractId,
    user_id: user.id,
    action: 'vendor.linked',
    details: { vendor_id: vendorId },
  });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: userData } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'reviewer' && userData.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const vendorId = searchParams.get('vendorId');

  if (!vendorId) {
    return NextResponse.json({ error: 'vendorId is required' }, { status: 400 });
  }

  const { error } = await admin
    .from('contract_vendors')
    .delete()
    .eq('contract_id', contractId)
    .eq('vendor_id', vendorId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await admin.from('audit_log').insert({
    contract_id: contractId,
    user_id: user.id,
    action: 'vendor.unlinked',
    details: { vendor_id: vendorId },
  });

  return NextResponse.json({ success: true });
}
