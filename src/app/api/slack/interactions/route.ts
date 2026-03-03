import { NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack-verify';
import { createAdminClient } from '@/lib/supabase/server';
import type { ContractStatus } from '@/types/contracts';

interface SlackAction {
  action_id: string;
  value: string;
}

interface SlackInteractionPayload {
  type: string;
  user: { id: string; username: string };
  actions: SlackAction[];
  response_url: string;
  message?: { ts: string };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');

  if (!verifySlackRequest(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Slack sends interaction payloads as form-encoded with a "payload" field
  const params = new URLSearchParams(rawBody);
  const payloadRaw = params.get('payload');
  if (!payloadRaw) {
    return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
  }

  const payload: SlackInteractionPayload = JSON.parse(payloadRaw);

  if (payload.type !== 'block_actions') {
    return NextResponse.json({ ok: true });
  }

  // Process actions asynchronously
  handleActions(payload).catch((err) => {
    console.error('Slack interaction handler error:', err);
  });

  // Respond immediately
  return NextResponse.json({ ok: true });
}

async function handleActions(payload: SlackInteractionPayload): Promise<void> {
  const admin = createAdminClient();
  const { actions, response_url, user } = payload;

  for (const action of actions) {
    const contractId = action.value;

    switch (action.action_id) {
      case 'renew_contract': {
        // Mark contract as active (renewed)
        const { data: contract } = await admin
          .from('contracts')
          .select('title, expiry_date, renewal_term_months')
          .eq('id', contractId)
          .single();

        if (!contract) {
          await respond(response_url, `Contract not found.`);
          break;
        }

        // Calculate new expiry based on renewal_term_months
        const months = contract.renewal_term_months || 12;
        const currentExpiry = contract.expiry_date ? new Date(contract.expiry_date) : new Date();
        const newExpiry = new Date(currentExpiry);
        newExpiry.setMonth(newExpiry.getMonth() + months);

        await admin
          .from('contracts')
          .update({
            status: 'active' as ContractStatus,
            expiry_date: newExpiry.toISOString().split('T')[0],
          })
          .eq('id', contractId);

        // Clear escalation log so new tiers can fire for the new term
        await admin
          .from('escalation_log')
          .delete()
          .eq('contract_id', contractId);

        // Audit log
        await admin.from('audit_log').insert({
          contract_id: contractId,
          action: 'contract.renewed',
          details: {
            renewed_by: user.username,
            source: 'slack',
            new_expiry: newExpiry.toISOString().split('T')[0],
            renewal_months: months,
          },
        });

        await respond(response_url, `:white_check_mark: *${contract.title}* has been renewed. New expiry: ${newExpiry.toLocaleDateString('en-AU')}.`);
        break;
      }

      case 'expire_contract': {
        const { data: contract } = await admin
          .from('contracts')
          .select('title')
          .eq('id', contractId)
          .single();

        await admin
          .from('contracts')
          .update({ status: 'expired' as ContractStatus })
          .eq('id', contractId);

        await admin.from('audit_log').insert({
          contract_id: contractId,
          action: 'contract.expired',
          details: {
            expired_by: user.username,
            source: 'slack',
          },
        });

        await respond(response_url, `:no_entry_sign: *${contract?.title ?? 'Contract'}* has been marked as expired.`);
        break;
      }

      case 'snooze_contract': {
        // Snooze = acknowledge this tier. The escalation_log row stays,
        // preventing re-fire at this tier. The next tier (e.g. 7d after 14d)
        // will fire when the contract reaches that threshold.
        const { data: contract } = await admin
          .from('contracts')
          .select('title, expiry_date')
          .eq('id', contractId)
          .single();

        if (!contract) {
          await respond(response_url, `Contract not found.`);
          break;
        }

        // Find current tier for logging
        const { data: latestEscalation } = await admin
          .from('escalation_log')
          .select('tier')
          .eq('contract_id', contractId)
          .order('sent_at', { ascending: false })
          .limit(1)
          .single();

        await admin.from('audit_log').insert({
          contract_id: contractId,
          action: 'contract.snoozed',
          details: {
            snoozed_by: user.username,
            source: 'slack',
            tier: latestEscalation?.tier ?? 'unknown',
          },
        });

        await respond(response_url, `:zzz: Acknowledged alert for *${contract.title}*. You'll be notified at the next escalation tier.`);
        break;
      }

      default:
        // Unknown action — ignore
        break;
    }
  }
}

async function respond(responseUrl: string, text: string): Promise<void> {
  await fetch(responseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      response_type: 'in_channel',
      replace_original: false,
      text,
    }),
  });
}
