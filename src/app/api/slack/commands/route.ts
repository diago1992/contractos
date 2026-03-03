import { NextResponse } from 'next/server';
import { verifySlackRequest } from '@/lib/slack-verify';
import { createAdminClient } from '@/lib/supabase/server';
import { DOCUMENT_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/utils/constants';
import type { DocumentType, ContractStatus } from '@/types/contracts';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');

  if (!verifySlackRequest(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const searchText = params.get('text')?.trim() || '';
  const responseUrl = params.get('response_url');

  // Respond immediately to satisfy Slack's 3-second timeout
  const immediateResponse = NextResponse.json({
    response_type: 'ephemeral',
    text: searchText
      ? `Searching for "${searchText}"...`
      : 'Fetching recent contracts...',
  });

  // Async: query and post results back to response_url
  if (responseUrl) {
    searchAndRespond(searchText, responseUrl).catch((err) => {
      console.error('Slack /contracts search failed:', err);
    });
  }

  return immediateResponse;
}

async function searchAndRespond(
  searchText: string,
  responseUrl: string
): Promise<void> {
  const supabase = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  let query = supabase
    .from('contracts')
    .select('id, title, document_type, status, counterparty_name, expiry_date')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (searchText) {
    query = query.textSearch('search_vector', searchText, { type: 'websearch' });
  }

  const { data: contracts, error } = await query.limit(5);

  if (error) {
    await postToResponseUrl(responseUrl, {
      response_type: 'ephemeral',
      text: `Error searching contracts: ${error.message}`,
    });
    return;
  }

  if (!contracts || contracts.length === 0) {
    await postToResponseUrl(responseUrl, {
      response_type: 'ephemeral',
      text: searchText
        ? `No contracts found matching "${searchText}".`
        : 'No contracts found.',
    });
    return;
  }

  const headerText = searchText
    ? `Found ${contracts.length} contract${contracts.length === 1 ? '' : 's'} matching "${searchText}":`
    : `Recent contracts:`;

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText },
    },
  ];

  for (const contract of contracts) {
    const typeLabel = contract.document_type
      ? DOCUMENT_TYPE_LABELS[contract.document_type as DocumentType] || contract.document_type
      : 'Unclassified';
    const statusLabel = CONTRACT_STATUS_LABELS[contract.status as ContractStatus] || contract.status;
    const counterparty = contract.counterparty_name || 'Unknown';
    const expiry = contract.expiry_date
      ? new Date(contract.expiry_date).toLocaleDateString('en-AU')
      : 'N/A';

    blocks.push(
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<${appUrl}/contracts/${contract.id}|${contract.title}>*\n`
            + `:page_facing_up: ${typeLabel}  |  Status: ${statusLabel}\n`
            + `:office: ${counterparty}  |  Expires: ${expiry}`,
        },
      },
      { type: 'divider' },
    );
  }

  await postToResponseUrl(responseUrl, {
    response_type: 'ephemeral',
    blocks,
  });
}

async function postToResponseUrl(
  url: string,
  body: Record<string, unknown>
): Promise<void> {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
