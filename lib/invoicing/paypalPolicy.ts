export function invoicePayPalAmountMinor(value: unknown): number {
  const text = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error('Invalid invoice amount.');
  const minor = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('Invoice has no payable balance.');
  return minor;
}

export function assertInvoicePayPalOrder(order: any, expected: {
  id: string; providerReference: string; currency: string; amountMinor: number;
}, captured = false) {
  const units = order?.purchase_units;
  if (order?.id !== expected.providerReference || !Array.isArray(units) || units.length !== 1 ||
    units[0].custom_id !== expected.id || units[0].amount?.currency_code !== expected.currency ||
    invoicePayPalAmountMinor(units[0].amount?.value) !== expected.amountMinor) {
    throw new Error('PayPal payment does not match this invoice checkout.');
  }
  if (!captured) return;
  const captures = units[0].payments?.captures;
  if (order.status !== 'COMPLETED' || !Array.isArray(captures) || captures.length !== 1 ||
    captures[0].status !== 'COMPLETED' || !captures[0].id ||
    captures[0].amount?.currency_code !== expected.currency ||
    invoicePayPalAmountMinor(captures[0].amount?.value) !== expected.amountMinor) {
    throw new Error('PayPal has not confirmed the full invoice payment. Do not pay again while it is pending.');
  }
  return String(captures[0].id);
}

export function invoiceMatchesPayPalQuote(invoice: {
  currency: string; balanceDue: unknown; status: string; updatedAt: Date;
}, checkout: { currency: string; amountMinor: number; invoiceUpdatedAt: Date }) {
  return !['DRAFT', 'CANCELLED', 'PAID'].includes(invoice.status) &&
    invoice.currency === checkout.currency &&
    Math.round(Number(invoice.balanceDue) * 100) === checkout.amountMinor &&
    invoice.updatedAt.getTime() === new Date(checkout.invoiceUpdatedAt).getTime();
}
