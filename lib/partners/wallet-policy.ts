export const PARTNER_WALLET_POLICY = 'EARNINGS_WALLET';
// Enabled only after the migration, transfer and receipt-confirmation paths are verified.
export const PARTNER_WALLET_READY = true;
export function walletTotals(credits: { state: string; amountMinor: bigint | string }[], withdrawals: { status: string; amountMinor: bigint | string }[]) {
  const sum = (items: { amountMinor: bigint | string }[]) => items.reduce((total, item) => total + BigInt(item.amountMinor), BigInt(0));
  const pending = sum(credits.filter(row => row.state === 'PENDING'));
  const held = sum(credits.filter(row => row.state === 'HELD'));
  const earned = sum(credits.filter(row => row.state === 'AVAILABLE'));
  const reserved = sum(withdrawals.filter(row => ['REQUESTED', 'PROCESSING', 'OTP_REQUIRED'].includes(row.status)));
  const paid = sum(withdrawals.filter(row => row.status === 'PAID'));
  const net = earned - reserved - paid;
  return { pending: pending.toString(), held: held.toString(), available: (net > BigInt(0) ? net : BigInt(0)).toString(), adjustmentDue: (net < BigInt(0) ? -net : BigInt(0)).toString(), reserved: reserved.toString(), paid: paid.toString() };
}
export function walletAmount(value: unknown) {
  const text = String(value ?? '');
  if (!/^[1-9]\d{0,14}$/.test(text) || BigInt(text) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Enter a valid amount in kobo.');
  return BigInt(text);
}
export function transferState(status: string) {
  if (status === 'success') return 'PAID';
  if (status === 'reversed') return 'REVERSED';
  if (['failed', 'abandoned', 'blocked', 'rejected'].includes(status)) return 'FAILED';
  if (status === 'otp') return 'OTP_REQUIRED';
  return 'PROCESSING';
}
