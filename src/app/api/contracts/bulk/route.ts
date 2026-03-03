import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { ContractStatus } from '@/types/contracts';

interface BulkRequest {
  action: 'change_status' | 'soft_delete' | 'export_csv';
  contractIds: string[];
  payload?: { status?: ContractStatus };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role;

  const body: BulkRequest = await request.json();
  const { action, contractIds, payload } = body;

  if (!contractIds || contractIds.length === 0) {
    return NextResponse.json({ error: 'No contracts selected' }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (action) {
    case 'change_status': {
      if (role !== 'reviewer' && role !== 'admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (!payload?.status) {
        return NextResponse.json({ error: 'Missing status' }, { status: 400 });
      }

      const { error } = await admin
        .from('contracts')
        .update({ status: payload.status })
        .in('id', contractIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Audit log
      await admin.from('audit_log').insert(
        contractIds.map((id) => ({
          contract_id: id,
          user_id: user.id,
          action: 'bulk_status_change',
          details: { new_status: payload.status },
        }))
      );

      return NextResponse.json({ updated: contractIds.length });
    }

    case 'soft_delete': {
      if (role !== 'admin') {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      }

      const { error } = await admin
        .from('contracts')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', contractIds);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Audit log
      await admin.from('audit_log').insert(
        contractIds.map((id) => ({
          contract_id: id,
          user_id: user.id,
          action: 'bulk_soft_delete',
          details: {},
        }))
      );

      return NextResponse.json({ deleted: contractIds.length });
    }

    case 'export_csv': {
      const { data: contracts, error } = await admin
        .from('contracts')
        .select('id, title, counterparty_name, document_type, status, extraction_status, effective_date, expiry_date, created_at')
        .in('id', contractIds)
        .is('deleted_at', null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const headers = ['ID', 'Title', 'Counterparty', 'Type', 'Status', 'Extraction', 'Effective Date', 'Expiry Date', 'Created'];
      const rows = (contracts ?? []).map((c) => [
        c.id,
        `"${(c.title || '').replace(/"/g, '""')}"`,
        `"${(c.counterparty_name || '').replace(/"/g, '""')}"`,
        c.document_type || '',
        c.status,
        c.extraction_status,
        c.effective_date || '',
        c.expiry_date || '',
        c.created_at,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="contracts-export-${Date.now()}.csv"`,
        },
      });
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
