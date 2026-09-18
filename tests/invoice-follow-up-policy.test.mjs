import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../lib/invoicing/followUpPolicy.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
new Function('exports', compiled)(exports);
const { nextInvoiceFollowUp: next, FOLLOW_UP_INTERVAL_MS: week } = exports;
const due = new Date('2026-09-01T12:00:00Z');
const invoice = { status: 'OVERDUE', balanceDue: 500, dueAt: due, pendingClaims: 0 };
const at = weeks => new Date(+due + weeks * week);
const sent = (n, status = 'SENT') => ({ status, followUpNumber: n, sentAt: at(n) });
test('first reminder is one week after due date, not issue date', () => {
  assert.equal(next(invoice, [], new Date(+at(1) - 1)), null);
  assert.equal(next(invoice, [], at(1)), 1);
});
test('send in weeks one, two and three, then stop permanently', () => {
  const history = [];
  for (let n = 1; n <= 3; n++) { assert.equal(next(invoice, history, at(n)), n); history.push(sent(n)); }
  for (const n of [3, 4, 100]) assert.equal(next(invoice, history, at(n)), null);
});
test('existing reminder history counts toward the cap', () => {
  assert.equal(next(invoice, [sent(1), sent(2), sent(3), sent(4)], at(100)), null);
  assert.equal(next(invoice, [sent(3)], at(100)), null);
  assert.equal(next(invoice, [sent(1), sent(1), sent(1)], at(100)), null);
});
test('delayed jobs send at most one reminder and wait a full week', () => {
  assert.equal(next(invoice, [], at(20)), 1);
  const history = [{ ...sent(1), sentAt: at(20) }];
  assert.equal(next(invoice, history, at(20.9)), null);
  assert.equal(next(invoice, history, at(21)), 2);
});
test('legacy reminders sent less than seven days ago prevent another send', () => {
  assert.equal(next(invoice, [{ ...sent(1), sentAt: at(9.5) }], at(10)), null);
});
test('in-flight and uncertain outcomes reserve slots to prevent duplicate delivery', () => {
  assert.equal(next(invoice, [sent(1, 'SENDING')], at(1)), null);
  assert.equal(next(invoice, [sent(1), sent(2), sent(3, 'UNCERTAIN')], at(100)), null);
});
test('settled, cancelled, unissued, no due date and pending claims are excluded', () => {
  for (const changes of [{status:'PAID'},{status:'CANCELLED'},{status:'DRAFT'},{status:'ISSUED'},{balanceDue:0},{balanceDue:-1},{dueAt:null},{pendingClaims:1}]) {
    assert.equal(next({...invoice,...changes}, [], at(10)), null);
  }
});
test('invalid dates fail closed', () => assert.equal(next({...invoice,dueAt:new Date('invalid')}, [], at(10)), null));
test('route reserves under a row lock, filters before limit and does not create tables', () => {
  const route = readFileSync(new URL('../app/api/cron/invoice-follow-ups/route.ts', import.meta.url), 'utf8');
  assert.match(route, /FOR UPDATE/);
  assert.match(route, /prisma\.\$transaction/);
  assert.match(route, /COALESCE\(f.attempts, 0\) < 3/);
  assert.match(route, /COALESCE\(f.sequence, 0\) < 3/);
  assert.ok(route.indexOf("status: 'SENDING'") < route.indexOf('export async function GET'));
  assert.doesNotMatch(route, /CREATE TABLE|ALTER TABLE|ensureInvoicingCoreTables|48 hours/);
  const notification = readFileSync(new URL('../lib/notifications/invoicing.ts', import.meta.url), 'utf8').split('export async function sendInvoiceFollowUpNotification')[1].split('export async function sendReceiptNotification')[0];
  assert.match(notification, /throwOnError: true/);
});
