import { createHmac, randomBytes } from 'crypto';

const NETSUITE_ACCOUNT_ID = process.env.NETSUITE_ACCOUNT_ID ?? '';
const NETSUITE_CONSUMER_KEY = process.env.NETSUITE_CONSUMER_KEY ?? '';
const NETSUITE_CONSUMER_SECRET = process.env.NETSUITE_CONSUMER_SECRET ?? '';
const NETSUITE_TOKEN_ID = process.env.NETSUITE_TOKEN_ID ?? '';
const NETSUITE_TOKEN_SECRET = process.env.NETSUITE_TOKEN_SECRET ?? '';

function getBaseUrl(): string {
  const accountId = NETSUITE_ACCOUNT_ID.toLowerCase().replace('_', '-');
  return `https://${accountId}.suitetalk.api.netsuite.com/services/rest`;
}

function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29');
}

function generateNonce(): string {
  return randomBytes(16).toString('hex');
}

function generateTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function buildSignature(
  method: string,
  url: string,
  params: Record<string, string>
): string {
  // Sort params alphabetically
  const sortedKeys = Object.keys(params).sort();
  const paramString = sortedKeys
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(paramString),
  ].join('&');

  const signingKey = `${percentEncode(NETSUITE_CONSUMER_SECRET)}&${percentEncode(NETSUITE_TOKEN_SECRET)}`;

  return createHmac('sha256', signingKey).update(baseString).digest('base64');
}

function buildAuthHeader(method: string, url: string): string {
  const nonce = generateNonce();
  const timestamp = generateTimestamp();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: NETSUITE_CONSUMER_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: timestamp,
    oauth_token: NETSUITE_TOKEN_ID,
    oauth_version: '1.0',
  };

  const signature = buildSignature(method, url, oauthParams);
  oauthParams.oauth_signature = signature;

  const headerParts = Object.entries(oauthParams)
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(', ');

  return `OAuth realm="${NETSUITE_ACCOUNT_ID}", ${headerParts}`;
}

export function isNetSuiteConfigured(): boolean {
  return !!(
    NETSUITE_ACCOUNT_ID &&
    NETSUITE_CONSUMER_KEY &&
    NETSUITE_CONSUMER_SECRET &&
    NETSUITE_TOKEN_ID &&
    NETSUITE_TOKEN_SECRET
  );
}

export async function netsuiteRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  const authHeader = buildAuthHeader(method, url);

  const headers: Record<string, string> = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`NetSuite API error (${res.status}): ${errorText}`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export async function netsuiteSuiteQL<T = Record<string, unknown>>(
  query: string
): Promise<{ items: T[]; hasMore: boolean; totalResults: number }> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/query/v1/suiteql`;
  const authHeader = buildAuthHeader('POST', url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Prefer: 'transient',
    },
    body: JSON.stringify({ q: query }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`NetSuite SuiteQL error (${res.status}): ${errorText}`);
  }

  return res.json();
}
