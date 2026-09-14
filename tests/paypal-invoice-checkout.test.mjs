import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as crypto from 'node:crypto';

function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name]; }, Date, console });
  return exports;
}
const policy = load('../lib/invoicing/paypalPolicy.ts');
const date = new Date('2026-09-13T12:00:00Z');
const expected = { id: 'PINV_test', providerReference: 'ORDER1', currency: 'USD', amountMinor: 1000 };
function provider(status = 'COMPLETED') { return { id: 'ORDER1', status, purchase_units: [{ custom_id: 'PINV_test', amount: { currency_code: 'USD', value: '10.00' }, payments: { captures: [{ id: 'CAPTURE1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '10.00' } }] } }] }; }

test('invoice amounts reject zero, negative, fractional-cent and invalid amounts', () => {
  assert.equal(policy.invoicePayPalAmountMinor('123.45'), 12345);
  for (const amount of ['0', '-1', 'NaN', '1.001', 'Infinity']) assert.throws(() => policy.invoicePayPalAmountMinor(amount));
});
test('only a matching completed capture is accepted', () => {
  assert.equal(policy.assertInvoicePayPalOrder(provider(), expected, true), 'CAPTURE1');
  for (const change of [
    (o) => { o.id = 'OTHER'; }, (o) => { o.purchase_units[0].custom_id = 'OTHER'; },
    (o) => { o.purchase_units[0].amount.value = '9.00'; },
    (o) => { o.purchase_units[0].payments.captures[0].amount.currency_code = 'GBP'; },
    (o) => { o.purchase_units[0].payments.captures[0].status = 'PENDING'; },
    (o) => { o.purchase_units.push(o.purchase_units[0]); },
  ]) { const order = provider(); change(order); assert.throws(() => policy.assertInvoicePayPalOrder(order, expected, true)); }
});

function fixture({ environment = 'live', changed = false, initialStatus = 'COMPLETED' } = {}) {
  const checkout = { ...expected, pidInvoice: 'INV1', status: 'PENDING', environment, invoiceUpdatedAt: date };
  const invoice = { pidInvoice: 'INV1', pidUser: 'USER1', currency: 'USD', balanceDue: changed ? 20 : 10, amountPaid: 0, grandTotal: 10, status: 'ISSUED', updatedAt: date, invoiceNumber: 'INV-1', linkedRequestId: 'shipping:SHIP1' };
  const counts = { payments: 0, invoicePayments: 0, receipts: 0, commissions: 0, shipping: 0, captures: 0, transactions: 0 };
  const prisma = {
    $queryRaw: async () => [checkout],
    $executeRaw: async (sql, ...args) => { if (sql.join('').includes('SET status =')) checkout.status = args[0]; return 1; },
    invoices: { findUniqueOrThrow: async () => invoice, update: async ({ data }) => Object.assign(invoice, data) },
    invoice_access_tokens: { findUnique: async () => ({ expiresAt: new Date(Date.now() + 10000), invoice }) },
    invoice_payment_claims: { count: async () => 0 },
    payments: { create: async () => { counts.payments++; } },
    invoice_payments: { create: async () => { counts.invoicePayments++; } },
    receipts: { create: async () => { counts.receipts++; } },
    shipping_only: { updateMany: async () => { counts.shipping++; } },
    invoice_audit_logs: { create: async () => {} },
    $transaction: async (fn) => { counts.transactions++; return fn(prisma); },
  };
  const service = load('../lib/invoicing/paypalCheckout.ts', {
    'node:crypto': crypto, '@/lib/prisma': { prisma }, './paypalPolicy': policy,
    './paypalClient': { invoicePayPalEnvironment: () => environment, invoicePayPalRequest: async (path) => {
      if (path.endsWith('/capture')) { counts.captures++; return provider(); }
      return provider(initialStatus);
    } },
    '@/app/api/invoicing/_lib/invoicing': { createUniqueReceiptNumber: async () => 'RCT-1', derivePaymentStatus: () => 'PAID' },
    '@/lib/invoiceLinkedService': { parseInvoiceLinkedRequestId: () => ({ type: 'shipping-only', id: 'SHIP1' }) },
    '@/lib/affiliate/shippingCommissions': { recordPaidShippingCommission: async () => { counts.commissions++; } },
  });
  return { ...service, counts, invoice, checkout };
}

test('a repeated paid callback creates one payment, receipt and shipping commission', async () => {
  const f = fixture();
  assert.equal((await f.confirmInvoicePayPalCheckout('PINV_test')).status, 'PAID');
  assert.equal((await f.confirmInvoicePayPalCheckout('PINV_test')).status, 'PAID');
  assert.deepEqual(f.counts, { payments: 1, invoicePayments: 1, receipts: 1, commissions: 1, shipping: 1, captures: 0, transactions: 1 });
});
test('changed invoice is rejected before capture', async () => {
  const f = fixture({ changed: true, initialStatus: 'APPROVED' });
  await assert.rejects(f.confirmInvoicePayPalCheckout('PINV_test'), /invoice changed/i);
  assert.equal(f.counts.captures, 0); assert.equal(f.counts.payments, 0);
});
test('money captured before an invoice change is recorded for allocation review', async () => {
  const f = fixture({ changed: true });
  assert.equal((await f.confirmInvoicePayPalCheckout('PINV_test')).status, 'REVIEW');
  assert.equal(f.counts.payments, 1); assert.equal(f.counts.receipts, 0); assert.equal(f.counts.commissions, 0);
  assert.equal(f.invoice.status, 'ISSUED');
});
test('sandbox confirmation never marks the shared live invoice paid', async () => {
  const f = fixture({ environment: 'sandbox' });
  assert.equal((await f.confirmInvoicePayPalCheckout('PINV_test')).status, 'SANDBOX_CONFIRMED');
  assert.equal(f.counts.payments, 0); assert.equal(f.counts.transactions, 0);
});
