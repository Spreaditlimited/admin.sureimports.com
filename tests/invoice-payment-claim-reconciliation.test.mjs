import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const paymentRouteSource = await readFile(
  new URL('../app/api/invoicing/invoices/[pidInvoice]/payments/route.ts', import.meta.url),
  'utf8',
);
const invoiceDetailsSource = await readFile(
  new URL('../app/(dashboard)/dashboard/invoicing/components/InvoiceDetails.tsx', import.meta.url),
  'utf8',
);

test('recording an invoice payment approves its matching pending claim in the same transaction', () => {
  const transactionSource = paymentRouteSource.split('prisma.$transaction')[1];

  assert.match(transactionSource, /invoice_payments\.create/);
  assert.match(transactionSource, /invoice_payment_claims\.findFirst/);
  assert.match(transactionSource, /pidInvoice,/);
  assert.match(transactionSource, /status: 'PENDING_CONFIRMATION'/);
  assert.match(transactionSource, /claimedAmount: toMoneyInput\(amountNum\)/);
  assert.match(transactionSource, /paymentReference/);
  assert.match(transactionSource, /status: 'APPROVED'/);
  assert.match(transactionSource, /approvedInvoicePaymentPid: pidInvoicePayment/);
});

test('automatic claim approval is recorded in the invoice audit log', () => {
  assert.match(paymentRouteSource, /CUSTOMER_PAYMENT_CLAIM_AUTO_APPROVED/);
  assert.match(paymentRouteSource, /approvedPaymentClaimPid/);
});

test('invoice page confirms when recording payment also approves a claim', () => {
  assert.match(invoiceDetailsSource, /approvedPaymentClaimPid/);
  assert.match(invoiceDetailsSource, /Payment recorded and matching claim approved/);
});
