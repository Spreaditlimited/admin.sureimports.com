import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(path, mocks = {}, globals = {}) {
  const filename = new URL(`../${path}`, import.meta.url);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require: (name) => { if (name in mocks) return mocks[name]; return require(name); }, process, Buffer, AbortSignal, fetch: globals.fetch || globalThis.fetch, console, ...globals }, { filename: filename.pathname });
  return exports;
}
const consent = load('lib/marketing/brevoConsent.ts');
const confirmed = { email: 'confirmed@example.com', status: 'ACTIVE', consentStatus: 'OPTED_IN', consentAt: new Date(), firstName: 'Ada', consentSource: 'resource_form' };

test('only confirmed active consent without withdrawals/bounces/complaints qualifies', () => {
  assert.equal(consent.hasConfirmedMarketingConsent(confirmed), true);
  for (const override of [{ consentStatus: 'PENDING_CONFIRMATION' }, { consentStatus: 'TEST_ONLY' }, { consentAt: null }, { status: 'UNSUBSCRIBED' }, { unsubscribedAt: new Date() }, { bouncedAt: new Date() }, { complainedAt: new Date() }]) {
    assert.equal(consent.hasConfirmedMarketingConsent({ ...confirmed, ...override }), false);
  }
  assert.equal(consent.hasConfirmedMarketingConsent(null), false);
});

function contactsFixture(local, remote, latest = local) {
  const requests = [];
  let reads = 0;
  const api = {
    getBrevoConfig: () => ({ listId: 22 }),
    getBrevoContact: async () => remote,
    isBrevoContactBlocked: (contact) => Boolean(contact.emailBlacklisted),
    brevoRequest: async (...args) => { requests.push(args); return {}; },
  };
  const module = load('lib/marketing/brevoContacts.ts', {
    '@/lib/prisma': { prisma: { marketing_contacts: { findUnique: async () => ++reads === 1 ? local : latest } } },
    './brevoClient': api, './brevoConsent': consent,
  });
  return { ...module, requests };
}

test('pending and test contacts never get created in Brevo', async () => {
  for (const status of ['PENDING_CONFIRMATION', 'TEST_ONLY']) {
    const fixture = contactsFixture({ ...confirmed, consentStatus: status }, null);
    assert.equal(await fixture.syncBrevoMarketingContact(confirmed.email), false);
    assert.equal(fixture.requests.length, 0);
  }
});

test('confirmed subscriber sync uses only Sure Imports list and attributes, never unblocks', async () => {
  const fixture = contactsFixture(confirmed, { listIds: [17], attributes: { FIRSTNAME: 'Other brand name' } });
  assert.equal(await fixture.syncBrevoMarketingContact(confirmed.email), true);
  const [path, method, body] = fixture.requests[0];
  assert.equal(path, '/contacts'); assert.equal(method, 'POST');
  assert.deepEqual(Array.from(body.listIds), [22]);
  assert.equal(body.updateEnabled, true);
  assert.equal(body.attributes.SUREIMPORTS_FIRSTNAME, 'Ada');
  assert.equal(body.attributes.FIRSTNAME, undefined);
  assert.equal(body.emailBlacklisted, undefined);
  assert.equal(body.smtpBlacklistSender, undefined);
});

test('withdrawal removes only Sure Imports list membership, preserving other brands', async () => {
  const fixture = contactsFixture({ ...confirmed, consentStatus: 'OPTED_OUT' }, { listIds: [17, 22] });
  assert.equal(await fixture.syncBrevoMarketingContact(confirmed.email), false);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0][0], '/contacts/lists/22/contacts/remove');
});

test('Brevo suppression is respected and never cleared', async () => {
  const fixture = contactsFixture(confirmed, { listIds: [17, 22], emailBlacklisted: true });
  assert.equal(await fixture.syncBrevoMarketingContact(confirmed.email), false);
  assert.ok(fixture.requests.every(([path]) => path.endsWith('/contacts/remove')));
});

test('a withdrawal during sync removes a just-added contact', async () => {
  const fixture = contactsFixture(confirmed, { listIds: [22] }, { ...confirmed, consentStatus: 'OPTED_OUT' });
  assert.equal(await fixture.syncBrevoMarketingContact(confirmed.email), false);
  assert.equal(fixture.requests.at(-1)[0], '/contacts/lists/22/contacts/remove');
});

function sendFixture(local, remote = null) {
  const calls = [];
  const template = load('lib/email/temp/mailTemplate2.ts');
  const content = load('lib/marketing/content.ts', { '../email/temp/mailTemplate2': template });
  const module = load('lib/marketing/brevo.ts', {
    './config': { normalizeMarketingRecipient: (email) => email.trim().toLowerCase() },
    './content': content,
    './brevoConsent': consent,
    '@/lib/prisma': { prisma: { marketing_contacts: { findUnique: async () => local } } },
    './brevoClient': {
      getBrevoConfig: () => ({ email: 'insights@sureimports.com', name: 'Sure Imports Insights', replyTo: 'insights@sureimports.com' }),
      getBrevoContact: async () => remote,
      isBrevoContactBlocked: (contact) => contact.emailBlacklisted,
      brevoRequest: async (...args) => { calls.push(args); return { messageId: '<brevo-test>' }; },
    },
  });
  return { ...module, calls };
}
const input = { recipientEmail: confirmed.email, subject: 'Welcome', bodyText: 'Hello {{firstName}}', firstName: 'Ada', ctaLabel: 'Visit Import Hub', ctaUrl: 'https://www.sureimports.com/import-from-china-to-nigeria', unsubscribeUrl: 'https://www.sureimports.com/api/marketing/unsubscribe?token=signed', tags: { delivery: 'local-delivery' } };

test('Brevo delivers the approved branded HTML with one-click unsubscribe and tracking tags', async () => {
  const fixture = sendFixture(confirmed);
  const result = await fixture.sendBrevoMarketingEmail(input);
  assert.equal(result.provider, 'brevo');
  const body = fixture.calls[0][2];
  assert.equal(body.sender.email, 'insights@sureimports.com');
  assert.match(body.htmlContent, /sureimports-standard-email-template/);
  assert.match(body.htmlContent, /https:\/\/www.sureimports.com\/email\/sureimports-logo-light.png/);
  assert.match(body.htmlContent, /border-top:4px solid #4c419c/);
  assert.match(body.textContent, /Hello Ada/);
  assert.doesNotMatch(body.htmlContent, /amazonSESUnsubscribeUrl/);
  assert.equal(body.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.ok(body.tags.includes('sureimports-marketing'));
});

test('send rechecks consent and provider suppression, including internal tests', async () => {
  for (const [local, remote, overrides] of [
    [{ ...confirmed, consentStatus: 'PENDING_CONFIRMATION' }, null, {}],
    [{ ...confirmed, consentStatus: 'OPTED_OUT' }, null, { testOnly: true }],
    [confirmed, { emailBlacklisted: true }, {}],
    [confirmed, null, { unsubscribeUrl: null }],
  ]) {
    const fixture = sendFixture(local, remote);
    await assert.rejects(() => fixture.sendBrevoMarketingEmail({ ...input, ...overrides }));
    assert.equal(fixture.calls.length, 0);
  }
  const fixture = sendFixture({ ...confirmed, consentStatus: 'TEST_ONLY', consentAt: null });
  await fixture.sendBrevoMarketingEmail({ ...input, testOnly: true, unsubscribeUrl: null });
  assert.equal(fixture.calls.length, 1);
});

test('shared-account webhook ignores another brand even if a message ID matches', async () => {
  let writes = 0;
  const module = load('lib/marketing/brevoEvents.ts', {
    '@/lib/prisma': { prisma: { marketing_deliveries: { findUnique: async () => ({ provider: 'SES' }) }, $transaction: async () => writes++ } },
    './brevoContacts': { removeBrevoMarketingContact: async () => writes++ },
  });
  assert.equal(await module.recordBrevoEvent({ 'message-id': '<other-brand>', event: 'unsubscribed' }), false);
  assert.equal(writes, 0);
});

test('webhook suppression cancels enrollment, invalidates old confirmation and removes only this list', async () => {
  for (const event of ['hard_bounce', 'spam', 'unsubscribed']) {
    const writes = [];
    const delivery = { id: 3, contactId: 7, provider: 'BREVO', recipientEmail: confirmed.email };
    const tx = {
      marketing_events: { create: async (data) => writes.push(['event', data]) },
      marketing_deliveries: { update: async (data) => writes.push(['delivery', data]), updateMany: async (data) => writes.push(['deliveryMany', data]) },
      marketing_contacts: { update: async (data) => writes.push(['contact', data]) },
      marketing_enrollments: { updateMany: async (data) => writes.push(['enrollment', data]) },
    };
    const module = load('lib/marketing/brevoEvents.ts', {
      '@/lib/prisma': { prisma: { marketing_deliveries: { findUnique: async () => delivery }, $transaction: async (fn) => fn(tx) } },
      './brevoContacts': { removeBrevoMarketingContact: async (email) => writes.push(['remove', email]) },
    });
    assert.equal(await module.recordBrevoEvent({ 'message-id': '<ours>', event, email: confirmed.email, ts_event: 1791800000 }), true);
    const contact = writes.find(([name]) => name === 'contact')[1].data;
    assert.equal(contact.optInTokenHash, null);
    assert.equal(contact.consentStatus, event === 'unsubscribed' ? 'OPTED_OUT' : 'SUPPRESSED');
    assert.equal(writes.find(([name]) => name === 'enrollment')[1].data.status, 'CANCELLED');
    assert.equal(writes.at(-1)[0], 'remove');
  }
});

test('late delivered events cannot reactivate a bounced or unsubscribed delivery', async () => {
  let conditional;
  const tx = {
    marketing_events: { create: async () => {} },
    marketing_deliveries: { update: async ({ data }) => assert.equal(data.status, undefined), updateMany: async (value) => conditional = value },
  };
  const module = load('lib/marketing/brevoEvents.ts', {
    '@/lib/prisma': { prisma: { marketing_deliveries: { findUnique: async () => ({ id: 3, provider: 'BREVO' }) }, $transaction: async (fn) => fn(tx) } },
    './brevoContacts': {},
  });
  await module.recordBrevoEvent({ 'message-id': '<ours>', event: 'delivered' });
  assert.deepEqual(Array.from(conditional.where.status.in), ['SENDING', 'SENT']);
});

test('webhook requires its private bearer secret before reading any event', async () => {
  const original = process.env.BREVO_MARKETING_WEBHOOK_SECRET;
  process.env.BREVO_MARKETING_WEBHOOK_SECRET = 'test-secret';
  let calls = 0;
  try {
    const route = load('app/api/marketing/email/brevo/webhook/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/marketing/brevoEvents': { recordBrevoEvent: async () => { calls++; return true; } },
    });
    const denied = await route.POST(new Request('https://admin.sureimports.com/hook', { method: 'POST', body: '{}' }));
    assert.equal(denied.status, 401); assert.equal(calls, 0);
    const allowed = await route.POST(new Request('https://admin.sureimports.com/hook', { method: 'POST', headers: { authorization: 'Bearer test-secret' }, body: '{}' }));
    assert.equal(allowed.status, 200); assert.equal(calls, 1);
  } finally {
    if (original === undefined) delete process.env.BREVO_MARKETING_WEBHOOK_SECRET;
    else process.env.BREVO_MARKETING_WEBHOOK_SECRET = original;
  }
});
