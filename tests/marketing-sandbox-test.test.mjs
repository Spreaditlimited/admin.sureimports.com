import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [configSource, sesSource, runnerSource, cronSource, vercelConfig] =
  await Promise.all([
    readFile(new URL('../lib/marketing/config.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/marketing/ses.ts', import.meta.url), 'utf8'),
    readFile(
      new URL('../lib/marketing/sandboxTestRun.ts', import.meta.url),
      'utf8',
    ),
    readFile(
      new URL('../app/api/cron/marketing-send/route.ts', import.meta.url),
      'utf8',
    ),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8').then(
      JSON.parse,
    ),
  ]);

test('sandbox sends are restricted to the explicit internal allowlist', () => {
  assert.match(configSource, /SES_SANDBOX_ALLOWED_RECIPIENTS/);
  assert.match(sesSource, /getSandboxAllowedRecipients\(\)\.has\(normalized\)/);
  assert.doesNotMatch(sesSource, /cutoverUser|SES_MARKETING_CUTOVER_AT/);
});

test('the five-day run sends five real sequence steps one day apart', () => {
  assert.match(runnerSource, /TEST_STEP_COUNT = 5/);
  assert.match(runnerSource, /TEST_INTERVAL_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(runnerSource, /sendSequenceStep/);
  assert.match(runnerSource, /sandbox-five-day:/);
  assert.match(runnerSource, /SEND_RATE_PAUSE_MS = 1_100/);
});

test('existing SES unsubscribe preferences are never reset during a send', () => {
  assert.doesNotMatch(sesSource, /UpdateContactCommand/);
  assert.match(sesSource, /CreateContactCommand/);
  assert.match(sesSource, /AlreadyExistsException/);
});

test('the marketing send cron is authenticated and runs hourly', () => {
  assert.match(cronSource, /Bearer \$\{secret\}/);
  const cron = vercelConfig.crons.find(
    (entry) => entry.path === '/api/cron/marketing-send',
  );
  assert.deepEqual(cron, {
    path: '/api/cron/marketing-send',
    schedule: '0 * * * *',
  });
});
