import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { publishNotificationToAllUsers } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Tiered escalation thresholds
// ---------------------------------------------------------------------------

interface EscalationTier {
  tier: string;
  daysBeforeExpiry: number;
  emoji: string;
  label: string;
}

const ESCALATION_TIERS: EscalationTier[] = [
  { tier: '30d', daysBeforeExpiry: 30, emoji: ':calendar:', label: '30-day notice' },
  { tier: '14d', daysBeforeExpiry: 14, emoji: ':warning:', label: '14-day warning' },
  { tier: '7d', daysBeforeExpiry: 7, emoji: ':rotating_light:', label: '7-day urgent' },
  { tier: 'overdue', daysBeforeExpiry: 0, emoji: ':no_entry:', label: 'Expired / overdue' },
];

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Fetch active contracts expiring within 30 days OR already expired
  const { data: contracts, error } = await admin
    .from('contracts')
    .select('id, title, expiry_date')
    .lte('expiry_date', thirtyDaysFromNow.toISOString())
    .in('status', ['active', 'under_review'])
    .is('deleted_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch existing escalation log entries to avoid duplicate alerts
  const contractIds = (contracts ?? []).map((c) => c.id);
  if (contractIds.length === 0) {
    return NextResponse.json({ notified: 0, tiers: {} });
  }

  // Fetch existing escalation log entries.
  // A row exists = that tier was already sent (or snoozed, which keeps the row).
  // Snooze acknowledges the current tier; the next tier fires when due.
  const { data: existingEscalations } = await admin
    .from('escalation_log')
    .select('contract_id, tier')
    .in('contract_id', contractIds);

  const alreadySent = new Set(
    (existingEscalations ?? []).map((e) => `${e.contract_id}:${e.tier}`)
  );

  let notified = 0;
  const tierCounts: Record<string, number> = {};

  for (const contract of contracts ?? []) {
    if (!contract.expiry_date) continue;

    const daysUntilExpiry = Math.ceil(
      (new Date(contract.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine which tier this contract falls into
    const applicableTier = getApplicableTier(daysUntilExpiry);
    if (!applicableTier) continue;

    // Skip if already escalated at this tier
    const key = `${contract.id}:${applicableTier.tier}`;
    if (alreadySent.has(key)) continue;

    // Send notification
    const message = daysUntilExpiry <= 0
      ? `${applicableTier.emoji} "${contract.title}" has expired (${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago)`
      : `${applicableTier.emoji} "${contract.title}" — ${applicableTier.label}: expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;

    await publishNotificationToAllUsers({
      contractId: contract.id,
      type: 'contract_expiring',
      message,
    });

    // Record escalation to prevent re-sending
    await admin
      .from('escalation_log')
      .upsert(
        { contract_id: contract.id, tier: applicableTier.tier },
        { onConflict: 'contract_id,tier' }
      );

    notified++;
    tierCounts[applicableTier.tier] = (tierCounts[applicableTier.tier] || 0) + 1;
  }

  return NextResponse.json({ notified, tiers: tierCounts });
}

function getApplicableTier(daysUntilExpiry: number): EscalationTier | null {
  // Return the most urgent tier that applies
  // Overdue (<=0), then 7d (<=7), then 14d (<=14), then 30d (<=30)
  for (const tier of ESCALATION_TIERS) {
    if (tier.tier === 'overdue' && daysUntilExpiry <= 0) return tier;
    if (tier.tier === '7d' && daysUntilExpiry > 0 && daysUntilExpiry <= 7) return tier;
    if (tier.tier === '14d' && daysUntilExpiry > 7 && daysUntilExpiry <= 14) return tier;
    if (tier.tier === '30d' && daysUntilExpiry > 14 && daysUntilExpiry <= 30) return tier;
  }
  return null;
}
