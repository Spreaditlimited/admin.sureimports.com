import 'server-only';
import { after } from 'next/server';
import { deliverPartnerEmails } from './email-delivery';

/** Queue entry is committed first. SMTP cannot roll back a successful review. */
export function schedulePartnerNotification(eventId: string) {
  after(async () => {
    try { await deliverPartnerEmails(eventId); }
    catch { console.error('[partner-notification] immediate delivery unavailable; queued for retry', { eventId }); }
  });
}
