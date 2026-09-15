import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file, modules = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      Date,
      Error,
      console,
      require: (id) => modules[id] ?? require(id),
    },
  );
  return exports;
}
const policy = load('../lib/intelligence/reportNotificationPolicy.ts');
test('voter email, not research queue email, receives the report deep link', () => {
  const email = policy.reportReadyEmail(
    'Medical scrubs',
    'medical-scrubs',
    'Voter@example.com',
  );
  assert.equal(email.xEmail, 'voter@example.com');
  assert.equal(
    email.xButtonLink,
    'https://www.sureimports.com/supplier-intelligence/reports/medical-scrubs',
  );
  assert.equal(email.throwOnError, true);
  assert.ok(!JSON.stringify(email).includes('hello@sureimports.com'));
});
test('notification identity deduplicates email case and repeated votes', () => {
  assert.equal(
    policy.reportNotificationKey('scrubs', 'Voter@example.com'),
    policy.reportNotificationKey('scrubs', ' voter@example.com '),
  );
  assert.notEqual(
    policy.reportNotificationKey('scrubs', 'one@example.com'),
    policy.reportNotificationKey('scrubs', 'two@example.com'),
  );
});
test('matching does not use unrelated description keywords', () => {
  assert.equal(
    policy.reportDemandMatches('medical scrubs', 'medical-scrubs'),
    true,
  );
  assert.equal(
    policy.reportDemandMatches('medical scrubs', 'medical-equipment'),
    false,
  );
  assert.equal(
    policy.reportDemandMatches(
      'custom request',
      'medical-scrubs',
      'medical-scrubs',
    ),
    true,
  );
  assert.equal(
    policy.reportDemandMatches('manufacturers', 'medical-scrubs'),
    false,
  );
});
test('customer email escapes input and rejects invalid links and recipients', () => {
  assert.match(
    policy.reportReadyEmail('<scrubs>', 'medical-scrubs', 'voter@example.com')
      .xBody1,
    /&lt;scrubs&gt;/,
  );
  assert.throws(() =>
    policy.reportReadyEmail('scrubs', '//evil.example', 'voter@example.com'),
  );
  assert.throws(() =>
    policy.reportReadyEmail('scrubs', 'scrubs', 'bad\n@example.com'),
  );
});
function fixture({ fail = false, claimed = true } = {}) {
  const statements = [];
  const emails = [];
  const prisma = {
    $queryRaw: async (strings) => {
      const sql = strings.join('?');
      statements.push({ sql });
      assert.match(sql, /p.status = 'published' AND v.status = 'published'/);
      return [
        {
          notificationKey: 'key',
          query: 'medical scrubs',
          reportSlug: 'medical-scrubs',
          email: 'voter@example.com',
          attempts: 0,
        },
      ];
    },
    $executeRaw: async (strings, ...values) => {
      const sql = strings.join('?');
      statements.push({ sql, values });
      return sql.includes("status = 'sending'") ? (claimed ? 1 : 0) : 1;
    },
  };
  const service = load('../lib/intelligence/reportDemandNotifications.ts', {
    '@/lib/prisma': { prisma },
    '@/lib/email/xMail2': {
      default: async (email) => {
        emails.push(email);
        if (fail) throw Error('SMTP rejected');
      },
    },
    './reportNotificationPolicy': policy,
  });
  return { service, statements, emails };
}
test('successful SMTP send records sentAt only after sending', async () => {
  const f = fixture();
  const result =
    await f.service.sendPendingReportNotifications('medical-scrubs');
  assert.equal(result.sent, 1);
  assert.equal(result.failed, 0);
  assert.equal(f.emails.length, 1);
  assert.ok(
    f.statements.some((s) => s.sql.includes("status = 'sent', sentAt")),
  );
});
test('SMTP failure remains pending with a future retry and no sent marker', async () => {
  const f = fixture({ fail: true });
  const result =
    await f.service.sendPendingReportNotifications('medical-scrubs');
  assert.equal(result.sent, 0);
  assert.equal(result.failed, 1);
  assert.ok(!f.statements.some((s) => s.sql.includes("status = 'sent'")));
  const retry = f.statements.find((s) => s.sql.includes("status = 'pending'"));
  assert.ok(
    retry.values.some((v) => v instanceof Date && v.getTime() > Date.now()),
  );
  assert.ok(retry.values.includes('SMTP rejected'));
});
test('concurrent worker that loses claim does not send', async () => {
  const f = fixture({ claimed: false });
  await f.service.sendPendingReportNotifications('medical-scrubs');
  assert.equal(f.emails.length, 0);
});
