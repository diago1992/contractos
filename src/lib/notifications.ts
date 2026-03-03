import { createAdminClient } from '@/lib/supabase/server';
import { postToSlack } from '@/lib/slack';
import type { NotificationType } from '@/types/contracts';

interface PublishNotificationParams {
  userId: string;
  contractId?: string;
  type: NotificationType;
  message: string;
}

export async function publishNotification({
  userId,
  contractId,
  type,
  message,
}: PublishNotificationParams) {
  const admin = createAdminClient();

  const { error } = await admin.from('notifications').insert({
    user_id: userId,
    contract_id: contractId ?? null,
    type,
    message,
    read: false,
  });

  if (error) {
    console.error('Failed to publish notification:', error.message);
  }

  // Fire-and-forget Slack notification
  postToSlack({ event: type, contractId, message }).catch((err) => {
    console.error('Slack post failed:', err);
  });
}

/**
 * Publish a notification to all users (e.g. contract expiring alerts).
 */
export async function publishNotificationToAllUsers({
  contractId,
  type,
  message,
}: Omit<PublishNotificationParams, 'userId'>) {
  const admin = createAdminClient();

  const { data: users, error: fetchError } = await admin
    .from('users')
    .select('id');

  if (fetchError || !users) {
    console.error('Failed to fetch users for notification:', fetchError?.message);
    return;
  }

  const rows = users.map((u) => ({
    user_id: u.id,
    contract_id: contractId ?? null,
    type,
    message,
    read: false,
  }));

  if (rows.length === 0) return;

  const { error } = await admin.from('notifications').insert(rows);

  if (error) {
    console.error('Failed to publish notifications to all users:', error.message);
  }
}
