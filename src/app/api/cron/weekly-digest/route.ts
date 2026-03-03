import { NextRequest, NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    return NextResponse.json({ error: 'Slack not configured' }, { status: 503 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Gather weekly stats in parallel
  const [
    newContracts,
    reviewedContracts,
    expiringSoon,
    overdueObligations,
    totalActive,
  ] = await Promise.all([
    // New contracts uploaded this week
    admin
      .from('contracts')
      .select('id, title', { count: 'exact', head: false })
      .gte('created_at', oneWeekAgo.toISOString())
      .is('deleted_at', null)
      .limit(5),

    // Contracts reviewed/verified this week
    admin
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .gte('verified_at', oneWeekAgo.toISOString())
      .is('deleted_at', null),

    // Contracts expiring in next 30 days
    admin
      .from('contracts')
      .select('id, title, expiry_date')
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', thirtyDaysFromNow.toISOString())
      .in('status', ['active', 'under_review'])
      .is('deleted_at', null)
      .order('expiry_date', { ascending: true })
      .limit(5),

    // Overdue obligations
    admin
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'overdue'),

    // Total active contracts
    admin
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .is('deleted_at', null),
  ]);

  // Build Slack message blocks
  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: ':newspaper: ContractOS Weekly Digest' },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Week of ${oneWeekAgo.toLocaleDateString('en-AU')} — ${now.toLocaleDateString('en-AU')}`,
      },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `:package: *New uploads:* ${newContracts.count ?? 0}` },
        { type: 'mrkdwn', text: `:white_check_mark: *Reviewed:* ${reviewedContracts.count ?? 0}` },
        { type: 'mrkdwn', text: `:file_folder: *Total active:* ${totalActive.count ?? 0}` },
        { type: 'mrkdwn', text: `:warning: *Overdue obligations:* ${overdueObligations.count ?? 0}` },
      ],
    },
  ];

  // Expiring contracts section
  const expiringList = expiringSoon.data ?? [];
  if (expiringList.length > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:calendar: *Contracts expiring in the next 30 days:*`,
        },
      },
    );

    for (const c of expiringList) {
      const expDate = c.expiry_date
        ? new Date(c.expiry_date).toLocaleDateString('en-AU')
        : 'N/A';
      const daysLeft = c.expiry_date
        ? Math.ceil((new Date(c.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• <${appUrl}/contracts/${c.id}|${c.title}> — expires ${expDate} (${daysLeft}d)`,
        },
      });
    }
  }

  // Recent uploads
  const newList = newContracts.data ?? [];
  if (newList.length > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:inbox_tray: *Recently uploaded:*`,
        },
      },
    );

    for (const c of newList) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• <${appUrl}/contracts/${c.id}|${c.title}>`,
        },
      });
    }
  }

  // Footer
  blocks.push(
    { type: 'divider' },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `<${appUrl}/dashboard|Open Dashboard> • <${appUrl}/analytics|View Analytics>`,
        },
      ],
    },
  );

  // Post to Slack
  try {
    const client = new WebClient(token);
    await client.chat.postMessage({
      channel,
      text: ':newspaper: ContractOS Weekly Digest',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks: blocks as any,
    });
  } catch (err) {
    console.error('Weekly digest Slack post failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Slack post failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sent: true,
    stats: {
      new_uploads: newContracts.count ?? 0,
      reviewed: reviewedContracts.count ?? 0,
      expiring_soon: expiringList.length,
      overdue_obligations: overdueObligations.count ?? 0,
      total_active: totalActive.count ?? 0,
    },
  });
}
