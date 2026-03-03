import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify that an incoming request is genuinely from Slack using
 * HMAC-SHA256 signature verification.
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export function verifySlackRequest(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret || !timestamp || !signature) {
    return false;
  }

  // Reject requests older than 5 minutes (replay prevention)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) {
    return false;
  }

  const basestring = `v0:${timestamp}:${rawBody}`;
  const computed = 'v0=' + createHmac('sha256', signingSecret)
    .update(basestring)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
