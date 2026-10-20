import { SupportError } from './policy';
export const attachmentLimit = 3 * 1024 * 1024;
export function inspectAttachment(bytes: Buffer, filename: string) {
  if (!bytes.length || bytes.length > attachmentLimit) throw new SupportError(413, 'Choose a file smaller than 3 MB.');
  const ext = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'jpg'
    : bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP' ? 'webp'
    : bytes.subarray(0,5).toString() === '%PDF-' ? 'pdf' : null;
  if (!ext) throw new SupportError(415, 'Choose a JPG, PNG, WebP image or PDF.');
  const stem = filename.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9 _()-]/g, '').trim().slice(0, 140) || 'Attachment';
  return { name: `${stem}.${ext}`, size: bytes.length };
}
export function retentionDays() {
  const days = Number(process.env.SUPPORT_ATTACHMENT_RETENTION_DAYS || 30);
  return Number.isInteger(days) && days >= 1 && days <= 90 ? days : 30;
}
