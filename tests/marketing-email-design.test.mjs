import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const content = fs.readFileSync(
  new URL('../lib/marketing/content.ts', import.meta.url),
  'utf8',
);
const standardTemplate = fs.readFileSync(
  new URL('../lib/email/temp/mailTemplate2.ts', import.meta.url),
  'utf8',
);

test('SES marketing email uses the standard Sure Imports Hostinger design', () => {
  assert.match(content, /import mailTemplate from '..\/email\/temp\/mailTemplate2'/);
  assert.match(content, /const standardHtml = mailTemplate\(/);
  assert.match(content, /zBodyTitle: escapeHtml\(input\.bodyTitle \|\| input\.subject\)/);
  assert.match(content, /zButtonTitle: input\.ctaLabel/);
  assert.match(content, /border-bottom:4px solid #c2410c/);
  assert.match(content, /box-shadow:0 8px 18px/);
  assert.match(content, /\{\{amazonSESUnsubscribeUrl\}\}/);
  assert.match(content, /standardHtml\.replace\(/);

  assert.match(standardTemplate, /sureimports-standard-email-template/);
  assert.match(standardTemplate, /https:\/\/sureimports\.com\/images\/logo\.png/);
  assert.match(standardTemplate, /Lagos, Nigeria: 5 Olutosin Ajayi Street/);
  assert.match(standardTemplate, /Guangzhou, China:/);
  assert.match(standardTemplate, /background:#f97316/);
  assert.match(standardTemplate, /This is an automated email from Sure Imports/);
});
