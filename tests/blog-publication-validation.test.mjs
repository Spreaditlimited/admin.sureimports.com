import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractInternalBlogSlugs,
  findAudienceRoutingIssues,
  findBlogPublicationIssues,
} from '../lib/blogPublicationValidation.ts';

test('extracts unique Sure Imports blog slugs from relative and absolute links', () => {
  assert.deepEqual(
    extractInternalBlogSlugs(`
      <a href="/blog/live-guide">One</a>
      <a href="https://www.sureimports.com/blog/live-guide?ref=article">Again</a>
      <a href="https://example.com/blog/external-guide">External</a>
    `),
    ['live-guide'],
  );
});

test('flags corporate-audience copy that sends readers to LineScout', () => {
  const issues = findAudienceRoutingIssues(`
    <p>Established organisations with formal procurement requirements can
      <a href="https://linescout.sureimports.com/sourcing-project?route_type=machine_sourcing">start here</a>.
    </p>
  `);

  assert.equal(issues.length, 1);
  assert.match(issues[0], /Corporate Sourcing/);
});

test('allows the separated small-business and corporate routes', () => {
  const issues = findAudienceRoutingIssues(`
    <p>Individuals and small businesses can <a href="https://linescout.sureimports.com/sourcing-project?route_type=machine_sourcing">use LineScout</a>. Established organisations can <a href="/corporate-sourcing">use Corporate Sourcing</a>.</p>
  `);

  assert.deepEqual(issues, []);
});

test('rejects missing, draft or not-yet-public internal blog targets', async () => {
  const prisma = {
    blog: {
      findMany: async () => [{ blogSlug: 'live-guide' }],
    },
  };
  const issues = await findBlogPublicationIssues({
    prisma,
    html: `
      <a href="/blog/live-guide">Live</a>
      <a href="/blog/future-guide">Future</a>
    `,
    publishAt: new Date('2026-09-03T12:00:00Z'),
  });

  assert.deepEqual(issues, [
    'Internal blog link is not public by the article publication time: /blog/future-guide',
  ]);
});
