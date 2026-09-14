import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { workspaceHarness } from './affiliate-admin-visibility.fixtures.mjs';
const root = new URL('../', import.meta.url).pathname;
const require = createRequire(root + 'package.json');
const ts = require('typescript');
const read = path => fs.readFileSync(root + path, 'utf8');
function load(file, deps = {}) { const exports = {}; new Function('exports', 'require', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exports, id => deps[id]); return exports; }
let query;
const data = load('lib/affiliate/adminVisibility.ts', { 'server-only': {}, '@/lib/prisma': { prisma: { affiliate_conversions: { groupBy: async args => { query = args; return []; } } } }, '@/lib/affiliate/security': { decryptAffiliateValue: () => { throw Error('invalid'); } } });
test('strict route identifiers', () => {
  for (const value of ['0', '-1', '1abc', '1.5', '9007199254740992', '001', '']) assert.equal(data.recordId(value), null);
  assert.equal(data.recordId('19'), 19);
});
test('pagination is bounded and stable', () => {
  assert.deepEqual(data.pagination('999', 51), { page: 3, pages: 3, total: 51, skip: 50, take: 25 });
  for (const value of ['-1', '1abc', 'Infinity', ['2']]) assert.equal(data.pagination(value, 100).page, 1);
  assert.equal(data.pagination('9', 0).page, 1);
});
test('customer identifiers cannot cross payment systems or match every customer', () => {
  assert.deepEqual(data.customerPaymentScope(null), { main: null, ledger: null });
  assert.deepEqual(data.customerPaymentScope('linescout:12'), { main: null, ledger: 'linescout:12' });
  assert.deepEqual(data.customerPaymentScope('SI12'), { main: 'SI12', ledger: 'SI12' });
});
test('summaries separate currency and status and scope the referral', async () => {
  await data.commissionSummary(4, 9);
  assert.deepEqual(query.by, ['commissionCurrency', 'status']);
  assert.deepEqual(query.where, { affiliateId: 4, referralId: 9 });
});
test('decryption failure is contained and does not expose encrypted data', () => assert.equal(data.privateText('secret'), 'Unavailable'));
test('detail pages authorize before data access and enforce affiliate ownership', () => {
  const profile = read('app/(dashboard)/dashboard/affiliates/[affiliateId]/page.tsx');
  const referral = read('app/(dashboard)/dashboard/affiliates/[affiliateId]/referrals/[referralId]/page.tsx');
  for (const page of [profile, referral]) {
    assert.ok(page.indexOf("requireAffiliateAdmin('view')") < page.indexOf('affiliateAccount(', page.indexOf('export default')));
    assert.match(page, /force-dynamic/);
    assert.doesNotMatch(page, /\.(create|update|delete|upsert)\(/);
  }
  assert.match(referral, /where: \{ id: referralId, affiliateId, customerReference: \{ not: null \} \}/);
  assert.match(referral, /pid_user: scope.main/);
  assert.match(referral, /customerReference: scope.ledger/);
  assert.match(referral, /else if \(!scope.ledger\)/);
});
test('new workspace selects no payout secrets, auth secrets or raw provider payloads', () => {
  for (const file of ['lib/affiliate/adminVisibility.ts', 'app/(dashboard)/dashboard/affiliates/[affiliateId]/page.tsx', 'app/(dashboard)/dashboard/affiliates/[affiliateId]/referrals/[referralId]/page.tsx']) {
    assert.doesNotMatch(read(file), /(?:passwordHash|keyHash|detailsCiphertext|destinationCiphertext|payloadJson|otpHash):\s*true/);
  }
});
test('nested affiliate routes retain existing access-control scope', () => {
  const access = load('lib/accessControl.ts');
  assert.equal(access.getRequiredServiceForPath('/dashboard/affiliates/1/referrals/2'), 'payout_requests');
  assert.equal(access.hasServiceAccess('payout_requests', 'L2', ['refunds']), false);
});
test('unauthorized detail requests do not query the database', async () => {
  for (const kind of ['profile', 'referral']) {
    const harness = workspaceHarness({ denied: true });
    await assert.rejects(harness.render(kind), /REDIRECT/);
    assert.equal(harness.calls.length, 0);
  }
});
test('another affiliate cannot expose a referral through a changed route', async () => {
  const harness = workspaceHarness();
  await assert.rejects(harness.render('referral', {}, { affiliateId: '9' }), /NOT_FOUND/);
  assert.ok(!harness.calls.some(call => ['payments', 'payment_records', 'payment_ledger_entries', 'refund_records'].includes(call.model)));
});
for (const tab of ['referrals', 'commissions', 'payouts', 'shipping', 'notifications']) {
  test(`affiliate ${tab} screen renders with fixture records`, async () => {
    const harness = workspaceHarness();
    const html = await harness.render('profile', { tab });
    assert.match(html, /Ada Okafor/);
    assert.match(html, /NGN 1,700\.00/);
    assert.match(html, /USD 5\.00/);
    assert.doesNotMatch(html, /undefined|NaN/);
  });
}
for (const tab of ['payments', 'invoices', 'commissions', 'refunds', 'deposits']) {
  test(`referral ${tab} screen renders with fixture records`, async () => {
    const harness = workspaceHarness();
    const html = await harness.render('referral', { tab });
    assert.match(html, /Chidi Nwosu/);
    assert.doesNotMatch(html, /undefined|NaN/);
    for (const call of harness.calls.filter(call => ['payments', 'invoice_payments', 'invoice_payment_claims', 'refund_records', 'bank_payment'].includes(call.model))) assert.equal(call.args.where.pidUser, 'CUSTOMER-DEMO');
  });
}
test('historical and current payments use their own customer-scoped registers', async () => {
  const harness = workspaceHarness();
  assert.match(await harness.render('referral', { register: 'archive' }), /HISTORICAL-DEMO/);
  const call = harness.calls.find(call => call.model === 'payment_records');
  assert.equal(call.args.where.pid_user, 'CUSTOMER-DEMO');
  assert.ok(!harness.calls.some(call => call.model === 'payments'));
});
test('LineScout customer renders ledger events without querying Sure Imports payments', async () => {
  const harness = workspaceHarness({ linescout: true });
  const html = await harness.render('referral');
  assert.match(html, /LEDGER-DEMO/);
  assert.match(html, /USD 250\.00/);
  assert.ok(!harness.calls.some(call => call.model === 'payments' || call.model === 'payment_records'));
  assert.equal(harness.calls.find(call => call.model === 'payment_ledger_entries').args.where.customerReference, 'linescout:42');
});
test('unclaimed visits never query customer financial records', async () => {
  const harness = workspaceHarness({ unclaimed: true });
  await assert.rejects(harness.render('referral'), /NOT_FOUND/);
  assert.ok(!harness.calls.some(call => ['payments', 'payment_records', 'payment_ledger_entries', 'refund_records'].includes(call.model)));
});
test('empty and malformed route states render safely', async () => {
  for (const tab of ['referrals', 'commissions', 'payouts', 'shipping', 'notifications']) {
    assert.match(await workspaceHarness({ empty: true }).render('profile', { tab }), /No /);
  }
  await assert.rejects(workspaceHarness().render('profile', {}, { affiliateId: 'bad' }), /NOT_FOUND/);
});

test('Admin counts and lists only real customer referrals', () => {
  const list = read('app/(dashboard)/dashboard/affiliates/page.tsx');
  assert.match(list, /referrals: \{ where: \{ customerReference: \{ not: null/);
  const profile = read('app/(dashboard)/dashboard/affiliates/[affiliateId]/page.tsx');
  assert.match(profile, /const where = \{ affiliateId: id, customerReference: \{ not: null/);
  assert.doesNotMatch(profile, /Tracked referrals|Unclaimed visit/);
});
