import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [config, hostinger, operations, runner, cron, content, sequence] = await Promise.all([
  readFile(new URL('../lib/marketing/config.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/marketing/hostinger.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/marketing/operations.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/marketing/sequenceRun.ts', import.meta.url), 'utf8'),
  readFile(new URL('../app/api/cron/marketing-send/route.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/marketing/content.ts', import.meta.url), 'utf8'),
  readFile(new URL('../lib/marketing/data/import-email-sequence-52-weeks.json', import.meta.url), 'utf8').then(JSON.parse),
]);

test('complete Hostinger configuration selects the SMTP provider', () => {
  assert.match(config, /hasHostingerMarketingConfig\(\) \? 'hostinger' : 'ses'/);
  assert.match(config, /MARKETING_SMTP_PASSWORD/);
  assert.match(config, /MARKETING_DAILY_SEND_LIMIT/);
});

test('Hostinger delivery uses authenticated TLS and one-click unsubscribe headers', () => {
  assert.match(hostinger, /minVersion: 'TLSv1\.2'/);
  assert.match(hostinger, /List-Unsubscribe/);
  assert.match(hostinger, /List-Unsubscribe-Post/);
  assert.match(hostinger, /renderMarketingEmail/);
  assert.match(content, /unsubscribeUrl/);
});

test('production sends never manufacture marketing consent', () => {
  assert.match(operations, /if \(!input\.testOnly\)/);
  assert.match(operations, /has not confirmed consent for marketing email/);
  assert.match(operations, /contact\.consentStatus === 'OPTED_IN'/);
  assert.doesNotMatch(operations, /consentStatus: getMarketingSendMode\(\) === 'sandbox' \? 'TEST_ONLY' : 'OPTED_IN'/);
});

test('the hourly runner enrolls only opted-in contacts and respects send limits', () => {
  assert.match(runner, /consentStatus: 'OPTED_IN'/);
  assert.match(runner, /getMarketingDailySendLimit/);
  assert.match(runner, /getMarketingBatchSize/);
  assert.match(runner, /idempotencyKey: `sequence:/);
  assert.match(cron, /processMarketingSequence/);
});

test('the welcome email links to a real resource without promising an unattached guide', () => {
  const welcome = sequence.steps[0];
  assert.equal(welcome.subject, 'Welcome to Sure Imports Insights');
  assert.equal(welcome.ctaUrl, 'https://www.sureimports.com/import-from-china-to-nigeria');
  assert.equal(welcome.ctaLabel, 'Visit Import Hub');
  assert.doesNotMatch(`${welcome.subject} ${welcome.previewText} ${welcome.bodyText}`, /guide is ready|start with the guide/i);
});
