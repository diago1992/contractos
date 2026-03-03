import { WebClient } from '@slack/web-api';
import type { NotificationType } from '@/types/contracts';

const EMOJI_MAP: Record<NotificationType, string> = {
  upload_complete: ':inbox_tray:',
  extraction_done: ':white_check_mark:',
  extraction_failed: ':x:',
  contract_expiring: ':warning:',
  spend_threshold_warning: ':warning:',
  spend_threshold_exceeded: ':rotating_light:',
};

const LABEL_MAP: Record<NotificationType, string> = {
  upload_complete: 'Contract Uploaded',
  extraction_done: 'Extraction Complete',
  extraction_failed: 'Extraction Failed',
  contract_expiring: 'Contract Expiring',
  spend_threshold_warning: 'Spend Threshold Warning',
  spend_threshold_exceeded: 'Spend Threshold Exceeded',
};

interface SlackNotificationParams {
  event: NotificationType;
  contractTitle?: string;
  contractId?: string;
  message: string;
}

export async function postToSlack({
  event,
  contractTitle,
  contractId,
  message,
}: SlackNotificationParams): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) return;

  try {
    const client = new WebClient(token);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emoji = EMOJI_MAP[event] || ':bell:';
    const label = LABEL_MAP[event] || 'Notification';

    // Build action buttons — expiring contracts get Renew/Expire/Snooze
    const actionElements: { type: 'button'; text: { type: 'plain_text'; text: string }; url?: string; action_id: string; value?: string; style?: string }[] = [];

    if (contractId) {
      actionElements.push({
        type: 'button' as const,
        text: { type: 'plain_text' as const, text: contractTitle ? `View: ${contractTitle.slice(0, 40)}` : 'View Contract' },
        url: `${appUrl}/contracts/${contractId}`,
        action_id: 'view_contract',
      });

      if (event === 'contract_expiring') {
        actionElements.push(
          {
            type: 'button' as const,
            text: { type: 'plain_text' as const, text: 'Renew' },
            action_id: 'renew_contract',
            value: contractId,
            style: 'primary',
          },
          {
            type: 'button' as const,
            text: { type: 'plain_text' as const, text: 'Let Expire' },
            action_id: 'expire_contract',
            value: contractId,
            style: 'danger',
          },
          {
            type: 'button' as const,
            text: { type: 'plain_text' as const, text: 'Snooze' },
            action_id: 'snooze_contract',
            value: contractId,
          },
        );
      }
    }

    const blocks = [
      {
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: `${emoji} *${label}*\n${message}`,
        },
      },
      ...(actionElements.length > 0 ? [{
        type: 'actions' as const,
        elements: actionElements,
      }] : []),
    ];

    await client.chat.postMessage({
      channel,
      text: `${emoji} ${label}: ${message}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blocks: blocks as any,
    });
  } catch (err) {
    console.error('Slack notification failed:', err instanceof Error ? err.stack || err.message : err);
  }
}
