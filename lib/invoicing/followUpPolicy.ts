export const FOLLOW_UP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_FOLLOW_UPS = 3;
// An uncertain SMTP outcome must not be retried automatically: it may have delivered.
export const COUNTED_FOLLOW_UP_STATUSES = ['SENT', 'SENDING', 'UNCERTAIN'];

export function nextInvoiceFollowUp(
  invoice: { status: string; balanceDue: unknown; dueAt: Date | null; pendingClaims: number },
  history: Array<{ status: string; sentAt: Date; followUpNumber: number }>,
  now = new Date(),
): number | null {
  if (invoice.status !== 'OVERDUE' || !(Number(invoice.balanceDue) > 0) || !invoice.dueAt || invoice.pendingClaims > 0) return null;
  const counted = history.filter(row => COUNTED_FOLLOW_UP_STATUSES.includes(row.status));
  const previous = Math.max(counted.length, ...counted.map(row => row.followUpNumber), 0);
  if (previous >= MAX_FOLLOW_UPS) return null;
  const latest = Math.max(invoice.dueAt.getTime(), ...counted.map(row => row.sentAt.getTime()));
  if (!Number.isFinite(latest) || now.getTime() - latest < FOLLOW_UP_INTERVAL_MS) return null;
  return previous + 1;
}
