import { decimalUnits, majorAmount } from './money';

export type RefundCapture = {
  paymentId: string;
  captureId: string;
  currency: string;
  capturedAmount: string;
  reservedAmount: string;
};

/** Only unambiguous same-currency capture allocations may be executed automatically. */
export function allocateRefund(
  amount: string,
  currency: string,
  captures: RefundCapture[],
) {
  let remaining = decimalUnits(amount, 2);
  if (remaining <= BigInt(0))
    throw new Error('A positive refund amount is required.');
  const seen = new Set<string>();
  const result: {
    paymentId: string;
    captureId: string;
    currency: string;
    amount: string;
  }[] = [];
  for (const capture of captures) {
    if (seen.has(capture.captureId))
      throw new Error('Duplicate capture linkage requires review.');
    seen.add(capture.captureId);
    if (capture.currency !== currency)
      throw new Error(
        'Mixed-currency payments require a verified conversion allocation.',
      );
    const available =
      decimalUnits(capture.capturedAmount, 2) -
      decimalUnits(capture.reservedAmount, 2);
    if (available < BigInt(0))
      throw new Error('Refund reservations exceed the original payment.');
    const applied = available < remaining ? available : remaining;
    if (applied > BigInt(0))
      result.push({
        paymentId: capture.paymentId,
        captureId: capture.captureId,
        currency,
        amount: majorAmount(applied),
      });
    remaining -= applied;
  }
  if (remaining !== BigInt(0))
    throw new Error('The refundable payment balance is insufficient.');
  return result;
}

export function validatedRefundStatus(
  refund: any,
  expected: {
    captureId: string;
    currency: string;
    amount: string;
    requestId: string;
  },
) {
  if (
    !refund?.id ||
    refund.amount?.currency_code !== expected.currency ||
    decimalUnits(String(refund.amount?.value || ''), 2) !==
      decimalUnits(expected.amount, 2) ||
    refund.invoice_id !== expected.requestId
  )
    throw new Error(
      'Provider refund details do not match the approved refund.',
    );
  const captureLink = refund.links?.find(
    (link: any) => link.rel === 'up',
  )?.href;
  if (
    captureLink &&
    !String(captureLink).endsWith(`/captures/${expected.captureId}`)
  )
    throw new Error('Refund capture does not match.');
  if (refund.status === 'COMPLETED') return 'SETTLED';
  if (['FAILED', 'CANCELLED'].includes(refund.status)) return 'FAILED';
  return 'PROCESSING';
}
