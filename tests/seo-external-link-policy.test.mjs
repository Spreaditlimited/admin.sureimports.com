import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractExternalUrls,
  validateExternalLinkContinuity,
} from '../lib/seo/externalLinkPolicy.ts';

test('extracts external links without treating Sure Imports links as external', () => {
  assert.deepEqual(
    extractExternalUrls(`
      <a href="https://www.alibaba.com">Alibaba</a>
      <a href="/corporate-sourcing">Corporate sourcing</a>
      <a href="https://linescout.sureimports.com/">LineScout</a>
    `),
    ['https://www.alibaba.com/'],
  );
});

test('rejects a rewrite that silently removes an external source', () => {
  assert.throws(
    () =>
      validateExternalLinkContinuity({
        originalHtml: '<a href="https://www.alibaba.com">Alibaba</a>',
        rewrittenHtml: '<p>No source link</p>',
      }),
    /External link preservation failed/,
  );
});

test('accepts retained links and documented replacements', () => {
  assert.doesNotThrow(() =>
    validateExternalLinkContinuity({
      originalHtml: `
        <a href="https://www.alibaba.com">Alibaba</a>
        <a href="https://old.example.com/guide">Old guide</a>
      `,
      rewrittenHtml: `
        <a href="https://www.alibaba.com/">Alibaba</a>
        <a href="https://new.example.com/guide">Updated guide</a>
      `,
      changes: [
        {
          originalUrl: 'https://old.example.com/guide',
          action: 'replaced',
          replacementUrl: 'https://new.example.com/guide',
          reason: 'The old source was superseded.',
        },
      ],
    }),
  );
});
