import { createHmac } from 'node:crypto';

import { getMarketingPublicUrl } from './config';

function signingSecret() {
  const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('A marketing unsubscribe signing secret is not configured.');
  return secret;
}

function sign(payload: string) {
  return createHmac('sha256', signingSecret()).update(payload).digest('base64url');
}

export function createMarketingUnsubscribeUrl(input: {
  email: string;
  pidContact: string;
}) {
  const payload = Buffer.from(
    JSON.stringify({ v: 1, e: input.email.trim().toLowerCase(), p: input.pidContact }),
  ).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${getMarketingPublicUrl()}/api/marketing/unsubscribe?token=${encodeURIComponent(token)}`;
}
