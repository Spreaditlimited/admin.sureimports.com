import 'server-only';

import { createDecipheriv, createHmac, hkdfSync } from 'node:crypto';

function masterKey() {
  const encoded = process.env.AFFILIATE_SECURITY_KEY;
  if (!encoded) throw new Error('AFFILIATE_SECURITY_KEY is not configured.');
  const master = Buffer.from(encoded, 'base64');
  if (master.length !== 32) throw new Error('AFFILIATE_SECURITY_KEY is invalid.');
  return master;
}

function keyFor(purpose: string) {
  return Buffer.from(hkdfSync('sha256', masterKey(), Buffer.alloc(0), purpose, 32));
}

export function decryptAffiliateValue(value: string) {
  const [version, iv, tag, ciphertext] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext) {
    throw new Error('Invalid encrypted affiliate value.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFor('affiliate-pii-v1'),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function affiliateFingerprint(value: string) {
  return createHmac('sha256', keyFor('affiliate-notification-recipient-v1')).update(value).digest('hex');
}

export function affiliateEmailHash(email: string) {
  return createHmac('sha256', keyFor('affiliate-email-v1')).update(email.trim().toLowerCase()).digest('hex');
}
