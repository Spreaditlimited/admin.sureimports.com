import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractLinkableUrls,
  findNewUnapprovedLinks,
  normalizeLinkableUrl,
} from '../lib/seo/linkPolicy.ts';

test('normalizes Sure Imports URLs and ignores unrelated external links', () => {
  assert.equal(normalizeLinkableUrl('/corporate-sourcing/'), '/corporate-sourcing');
  assert.equal(
    normalizeLinkableUrl('https://www.sureimports.com/corporate-sourcing?ref=blog#form'),
    '/corporate-sourcing',
  );
  assert.equal(
    normalizeLinkableUrl('https://linescout.sureimports.com/'),
    'https://linescout.sureimports.com/',
  );
  assert.equal(normalizeLinkableUrl('https://example.com/service'), null);
});

test('extracts unique internal and Sure Imports subdomain links', () => {
  assert.deepEqual(
    extractLinkableUrls(`
      <a href="/corporate-sourcing">Corporate sourcing</a>
      <a href='/corporate-sourcing/'>Again</a>
      <a href="https://linescout.sureimports.com/">LineScout</a>
    `),
    ['/corporate-sourcing', 'https://linescout.sureimports.com/'],
  );
});

test('approved corporate sourcing links do not require review', () => {
  const result = findNewUnapprovedLinks({
    originalHtml: '<p>Original</p>',
    rewrittenHtml: '<p>Use <a href="/corporate-sourcing">Corporate Sourcing</a>.</p>',
    approvedUrls: ['/corporate-sourcing'],
  });

  assert.deepEqual(result.discovered, ['/corporate-sourcing']);
  assert.deepEqual(result.pending, []);
});

test('only newly introduced unapproved links require review', () => {
  const result = findNewUnapprovedLinks({
    originalHtml: '<a href="/legacy-service">Existing link</a>',
    rewrittenHtml: `
      <a href="/legacy-service">Existing link</a>
      <a href="/new-service">New link</a>
    `,
    approvedUrls: ['/corporate-sourcing'],
  });

  assert.deepEqual(result.pending, ['/new-service']);
});

test('a one-change decision resumes validation without global approval', () => {
  const result = findNewUnapprovedLinks({
    originalHtml: '<p>Original</p>',
    rewrittenHtml: '<a href="/new-service">New link</a>',
    approvedUrls: [],
    decisions: { '/new-service': 'once' },
  });

  assert.deepEqual(result.pending, []);
});

