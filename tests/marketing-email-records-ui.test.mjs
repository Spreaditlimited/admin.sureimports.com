import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync(
  new URL('../app/(dashboard)/dashboard/marketing/email/page.tsx', import.meta.url),
  'utf8',
);
const records = fs.readFileSync(
  new URL('../app/(dashboard)/dashboard/marketing/email/EmailRecords.tsx', import.meta.url),
  'utf8',
);
const wat = fs.readFileSync(
  new URL('../lib/time/wat.ts', import.meta.url),
  'utf8',
);

test('email operations exposes searchable lifecycle records and sequence emails', () => {
  assert.match(page, /postCutoverUsers/);
  assert.match(page, /joinedAtByEmail/);
  assert.match(page, /optInRequestedAt: true/);
  assert.match(page, /consentAt: true/);
  assert.match(page, /unsubscribedAt: true/);
  assert.match(page, /bouncedAt: true/);
  assert.match(page, /complainedAt: true/);
  assert.match(page, /<EmailRecords/);

  assert.match(records, /Search post-cutover contacts/);
  assert.match(records, /Search imported sequence/);
  assert.match(records, /Account joined/);
  assert.match(records, /Confirmation sent/);
  assert.match(records, /Opted in/);
  assert.match(records, /Confirmation expires/);
  assert.match(records, /Last updated/);
  assert.match(records, /formatWatDateTime/);
  assert.doesNotMatch(records, /Intl\.DateTimeFormat|toLocaleString/);
  assert.match(records, /max-h-\[560px\]/);
});

test('email record timestamps use deterministic WAT formatting during hydration', () => {
  assert.match(wat, /WAT_OFFSET_MS/);
  assert.match(wat, /getUTCHours/);
  assert.match(wat, / WAT`/);
});
