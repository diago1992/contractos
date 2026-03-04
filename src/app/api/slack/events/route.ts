import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { verifySlackRequest } from '@/lib/slack-verify';
import { createAdminClient } from '@/lib/supabase/server';
import { processContract } from '@/lib/agents/ingestion';
import { MAX_FILE_SIZE, ACCEPTED_FILE_TYPES } from '@/lib/utils/constants';

const ACCEPTED_MIMETYPES = Object.keys(ACCEPTED_FILE_TYPES);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');

  // Verify signature BEFORE parsing body to prevent processing forged requests
  if (!verifySlackRequest(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: SlackEventPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Handle Slack URL verification challenge
  if (payload.type === 'url_verification') {
    return NextResponse.json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (!event || event.type !== 'file_shared') {
    return NextResponse.json({ ok: true });
  }

  // Only handle files in the configured channel
  const channelId = process.env.SLACK_CHANNEL_ID;
  if (channelId && event.channel_id !== channelId) {
    return NextResponse.json({ ok: true });
  }

  // Respond immediately, process async
  handleFileShared(event.file_id, event.channel_id, event.event_ts).catch(
    (err) => {
      console.error('Slack file_shared handler failed:', err);
    }
  );

  return NextResponse.json({ ok: true });
}

async function handleFileShared(
  fileId: string,
  channelId: string,
  threadTs: string
): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    console.error('SLACK_BOT_TOKEN not configured');
    return;
  }

  const slack = new WebClient(token);

  // Get file info from Slack
  const fileInfo = await slack.files.info({ file: fileId });
  const file = fileInfo.file;
  if (!file) return;

  const mimetype = file.mimetype || '';
  const filename = file.name || 'unknown';
  const filesize = file.size || 0;
  const downloadUrl = file.url_private_download;

  // Silently ignore non-PDF/DOCX files
  if (!ACCEPTED_MIMETYPES.includes(mimetype)) {
    return;
  }

  // Warn about oversized files
  if (filesize > MAX_FILE_SIZE) {
    await slack.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: `:warning: File "${filename}" is too large (${Math.round(filesize / 1024 / 1024)}MB). Maximum size is ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB.`,
    });
    return;
  }

  if (!downloadUrl) {
    console.error('No download URL for Slack file:', fileId);
    return;
  }

  // Post processing status in thread
  await slack.chat.postMessage({
    channel: channelId,
    thread_ts: threadTs,
    text: `:hourglass_flowing_sand: Processing *${filename}*...`,
  });

  // Download file from Slack
  const fileResponse = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!fileResponse.ok) {
    await slack.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: `:x: Failed to download *${filename}* from Slack.`,
    });
    return;
  }

  const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
  const supabase = createAdminClient();
  const storagePath = `slack/${Date.now()}_${filename}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('contracts')
    .upload(storagePath, fileBuffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (uploadError) {
    console.error('Supabase upload failed:', uploadError);
    await slack.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: `:x: Failed to store *${filename}*. Please try uploading via the web app.`,
    });
    return;
  }

  // Create contract record
  const { data: contract, error: insertError } = await supabase
    .from('contracts')
    .insert({
      title: filename.replace(/\.(pdf|docx)$/i, ''),
      file_path: storagePath,
      file_name: filename,
      file_size_bytes: filesize,
      file_type: mimetype,
      uploaded_by: null,
      status: 'draft',
      extraction_status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !contract) {
    console.error('Contract insert failed:', insertError);
    await slack.chat.postMessage({
      channel: channelId,
      thread_ts: threadTs,
      text: `:x: Failed to create contract record for *${filename}*.`,
    });
    return;
  }

  // Audit log
  await supabase.from('audit_log').insert({
    action: 'contract.uploaded',
    user_id: null,
    contract_id: contract.id,
    details: {
      source: 'slack',
      slack_file_id: fileId,
      file_name: filename,
      file_size: filesize,
    },
  });

  // Atomic claim: set extraction_status to 'processing'
  const { error: claimError } = await supabase
    .from('contracts')
    .update({ extraction_status: 'processing' as const })
    .eq('id', contract.id)
    .in('extraction_status', ['pending', 'failed']);

  if (claimError) {
    console.error('Contract claim failed:', claimError);
    return;
  }

  // Process contract (AI extraction pipeline)
  processContract(contract.id).catch((err) => {
    console.error('Contract processing failed:', err);
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  await slack.chat.postMessage({
    channel: channelId,
    thread_ts: threadTs,
    text: `:white_check_mark: *${filename}* uploaded to ContractOS. AI extraction is running.`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:white_check_mark: *${filename}* uploaded to ContractOS.\nAI extraction is running — you'll be notified when it's done.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in ContractOS' },
            url: `${appUrl}/contracts/${contract.id}`,
            action_id: 'view_contract',
          },
        ],
      },
    ] as any,
  });
}

// Types for Slack event payloads
interface SlackEventPayload {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    file_id: string;
    channel_id: string;
    event_ts: string;
  };
}
