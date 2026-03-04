import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { addMonths, format, startOfMonth } from 'date-fns';
import {
  CONTRACT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  RISK_SEVERITY_LABELS,
  OBLIGATION_STATUS_LABELS,
} from '@/lib/utils/constants';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Fetch all data in parallel
  const [contractsRes, termsRes, riskFlagsRes, obligationsRes] = await Promise.all([
    admin.from('contracts').select('id, status, document_type, expiry_date, created_at').is('deleted_at', null),
    admin.from('commercial_terms').select('contract_id, amount, created_at'),
    admin.from('risk_flags').select('severity'),
    admin.from('obligations').select('status'),
  ]);

  const allContracts = contractsRes.data ?? [];
  const allTerms = termsRes.data ?? [];
  const allRisks = riskFlagsRes.data ?? [];
  const allObligations = obligationsRes.data ?? [];

  // --- Status Breakdown ---
  const statusCounts: Record<string, number> = {};
  for (const c of allContracts) {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  }
  const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    label: (CONTRACT_STATUS_LABELS as Record<string, string>)[status] || status,
    count,
  }));

  // --- Type Distribution ---
  const typeCounts: Record<string, number> = {};
  for (const c of allContracts) {
    const dt = c.document_type ?? 'unclassified';
    typeCounts[dt] = (typeCounts[dt] || 0) + 1;
  }
  const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({
    type,
    label: (DOCUMENT_TYPE_LABELS as Record<string, string>)[type] || type,
    count,
  }));

  // --- Expiry Timeline (12 months ahead) ---
  const now = new Date();
  const expiryTimeline = [];
  for (let i = 0; i < 12; i++) {
    const monthStart = startOfMonth(addMonths(now, i));
    const monthEnd = startOfMonth(addMonths(now, i + 1));
    const monthLabel = format(monthStart, 'MMM yyyy');
    const count = allContracts.filter((c) => {
      if (!c.expiry_date) return false;
      const d = new Date(c.expiry_date);
      return d >= monthStart && d < monthEnd;
    }).length;
    expiryTimeline.push({ month: monthLabel, count });
  }

  // --- Risk Summary ---
  const riskCounts: Record<string, number> = {};
  for (const r of allRisks) {
    riskCounts[r.severity] = (riskCounts[r.severity] || 0) + 1;
  }
  const riskSummary = Object.entries(riskCounts).map(([severity, count]) => ({
    severity,
    label: (RISK_SEVERITY_LABELS as Record<string, string>)[severity] || severity,
    count,
  }));

  // --- Contract Value Over Time ---
  const valueByMonth: Record<string, number> = {};
  for (const t of allTerms) {
    if (t.amount == null) continue;
    const monthKey = format(new Date(t.created_at), 'MMM yyyy');
    valueByMonth[monthKey] = (valueByMonth[monthKey] || 0) + Number(t.amount);
  }
  const contractValueOverTime = Object.entries(valueByMonth)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([month, value]) => ({ month, value }));

  // --- Obligation Breakdown ---
  const obCounts: Record<string, number> = {};
  for (const o of allObligations) {
    obCounts[o.status] = (obCounts[o.status] || 0) + 1;
  }
  const obligationBreakdown = Object.entries(obCounts).map(([status, count]) => ({
    status,
    label: (OBLIGATION_STATUS_LABELS as Record<string, string>)[status] || status,
    count,
  }));

  // --- Totals ---
  const totalContracts = allContracts.length;
  const totalValue = allTerms.reduce((sum, t) => sum + (t.amount ? Number(t.amount) : 0), 0);
  const avgValue = totalContracts > 0 ? totalValue / totalContracts : 0;

  return NextResponse.json({
    statusBreakdown,
    typeDistribution,
    expiryTimeline,
    riskSummary,
    contractValueOverTime,
    obligationBreakdown,
    totals: { totalContracts, totalValue, avgValue },
  }, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  });
}
