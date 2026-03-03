import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ObligationStatus } from '@/types/contracts';

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check role — reviewer+ required
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
  const { obligationIds, status, contractId } = body as {
    obligationIds: string[];
    status: ObligationStatus;
    contractId: string;
  };

  if (!obligationIds?.length || !status || !contractId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const validStatuses: ObligationStatus[] = ['pending', 'in_progress', 'completed', 'overdue', 'waived'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Update all obligations
  const { error: updateError } = await admin
    .from('obligations')
    .update({ status })
    .in('id', obligationIds)
    .eq('contract_id', contractId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Create audit log entries
  const auditRows = obligationIds.map((obligationId) => ({
    contract_id: contractId,
    user_id: user.id,
    action: 'obligation.status_changed',
    details: { obligation_id: obligationId, new_status: status },
  }));

  await admin.from('audit_log').insert(auditRows);

  return NextResponse.json({ success: true, updated: obligationIds.length });
}
