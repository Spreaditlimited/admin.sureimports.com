import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from 'node:crypto';

function key() {
  const master = Buffer.from(
    process.env.AFFILIATE_SECURITY_KEY || '',
    'base64',
  );
  if (master.length !== 32)
    throw new Error('Refund destination protection is not configured.');
  return Buffer.from(
    hkdfSync('sha256', master, Buffer.alloc(0), 'refund-destination-v1', 32),
  );
}
export function protectRefundDestination(data: unknown, refundId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from(refundId));
  const dataBytes = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), dataBytes]
    .map((v) => v.toString('base64url'))
    .join('.');
}
export function readRefundDestination(envelope: string, refundId: string) {
  const [iv, tag, data] = envelope
    .split('.')
    .map((v) => Buffer.from(v, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAAD(Buffer.from(refundId));
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8'),
  ) as Record<string, string>;
}
