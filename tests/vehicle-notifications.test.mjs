import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ channel = 'EMAIL', attempts = 0, send = async () => {}, env = {} } = {}) {
  const row = { id: 'notification-1', eventId: 'event-1', channel, attempts, status: 'PENDING', nextAttemptAt: new Date(0), leaseUntil: null, event: { type: 'SHIPPED', message: 'Your vehicle is on its way.', order: { id: 'order-1', customerName: '<Customer>', vehicleName: 'Ruichi EC75', email: 'customer@example.test', phone: '+2348000000000' } } };
  const eligible = () => row.status === 'PENDING' && row.nextAttemptAt <= new Date() || row.status === 'SENDING' && row.leaseUntil < new Date();
  const prisma = { vehicle_notifications: {
    findMany: async () => eligible() ? [structuredClone(row)] : [],
    updateMany: async ({ where, data }) => { if (!eligible() || where.attempts !== row.attempts) return { count: 0 }; Object.assign(row, { ...data, attempts: row.attempts + data.attempts.increment }); return { count: 1 }; },
    update: async ({ data }) => Object.assign(row, data),
  } };
  const source = readFileSync(new URL('../lib/vehicles/notifications.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) {
    if (name === '@/lib/prisma') return { prisma };
    if (name === '@/lib/email/config/sendEmail') return { __esModule: true, default: send };
    if (name === './policy') return { STAGE_LABELS: { SHIPPED: 'Dispatched from China' } };
    throw new Error(`Unexpected import: ${name}`);
  }, process: { env }, Date, AbortSignal, fetch: async () => ({ ok: true }), console });
  return { row, dispatch: exports.dispatchVehicleNotifications };
}

test('failed email remains queued and a later successful attempt completes it', async () => {
  let calls = 0;
  const h = harness({ send: async (_to, _subject, html) => { assert.match(html, /&lt;Customer&gt;/); if (++calls === 1) throw new Error('SMTP unavailable'); } });
  await h.dispatch(); assert.equal(h.row.status, 'PENDING'); assert.equal(h.row.attempts, 1); assert.ok(h.row.nextAttemptAt > new Date());
  h.row.nextAttemptAt = new Date(0); await h.dispatch(); assert.equal(h.row.status, 'SENT'); assert.equal(h.row.attempts, 2); assert.equal(h.row.lastError, null);
});
test('missing WhatsApp configuration never reports successful delivery', async () => {
  const h = harness({ channel: 'WHATSAPP' }); await h.dispatch(); assert.equal(h.row.status, 'PENDING'); assert.match(h.row.lastError, /Configure/);
});
test('exhausted notifications enter the visible failure queue', async () => {
  const h = harness({ attempts: 7, send: async () => { throw new Error('Unavailable'); } }); await h.dispatch(); assert.equal(h.row.status, 'FAILED'); assert.equal(h.row.attempts, 8);
});
test('concurrent workers claim a notification only once', async () => {
  let sent = 0; const h = harness({ send: async () => { sent++; } }); await Promise.all([h.dispatch(), h.dispatch()]); assert.equal(sent, 1); assert.equal(h.row.status, 'SENT');
});
test('an expired worker lease is recoverable', async () => {
  const h = harness(); h.row.status = 'SENDING'; h.row.leaseUntil = new Date(0); await h.dispatch(); assert.equal(h.row.status, 'SENT');
});
