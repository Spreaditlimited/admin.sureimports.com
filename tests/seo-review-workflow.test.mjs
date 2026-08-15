import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowSource = await readFile(
  new URL('../lib/seo/changeReview.ts', import.meta.url),
  'utf8',
);
const progressRouteSource = await readFile(
  new URL('../app/api/marketing/seo/changes/[pidChange]/rewrite-status/route.ts', import.meta.url),
  'utf8',
);
const gscAdminRouteSource = await readFile(
  new URL('../app/api/marketing/seo/gsc-import/route.ts', import.meta.url),
  'utf8',
);
const gscImportControlSource = await readFile(
  new URL('../app/(dashboard)/dashboard/marketing/seo/components/GscImportControl.tsx', import.meta.url),
  'utf8',
);
const opportunityDraftSource = await readFile(
  new URL('../lib/seo/opportunityDrafts.ts', import.meta.url),
  'utf8',
);
const seoQueueSource = await readFile(
  new URL('../app/(dashboard)/dashboard/marketing/seo/page.tsx', import.meta.url),
  'utf8',
);

test('article rewrite generation is separate from final application', () => {
  const prepareSection = workflowSource.split('export async function prepareSeoRewrite')[1]
    .split('export async function applySeoMetadataChange')[0];
  const applySection = workflowSource.split('export async function applySeoMetadataChange')[1]
    .split('export async function approveSeoRewriteLink')[0];

  assert.match(prepareSection, /startOpenAiRewrite/);
  assert.doesNotMatch(applySection, /startOpenAiRewrite/);
  assert.match(applySection, /current research and link-preservation policy/);
  assert.match(applySection, /validateExternalLinkContinuity/);
});

test('rewrite generation uses resumable background research and the current quality policy', () => {
  const rewriteSection = workflowSource.split('async function startOpenAiRewrite')[1]
    .split('async function retrieveOpenAiRewrite')[0];

  assert.match(rewriteSection, /gpt-5\.6-sol/);
  assert.match(rewriteSection, /background: true/);
  assert.match(rewriteSection, /reasoning: \{ effort: "high" \}/);
  assert.match(rewriteSection, /tools: \[\{ type: "web_search" \}\]/);
  assert.match(workflowSource, /rewritePolicyCurrent/);
  assert.match(workflowSource, /openAiResponseId/);
  assert.match(workflowSource, /retrieveOpenAiRewrite/);
});

test('link approval prepares the saved rewrite instead of applying it', () => {
  const approvalSection = workflowSource.split('export async function approveSeoRewriteLink')[1]
    .split('export async function discardSeoRewrite')[0];

  assert.match(approvalSection, /return prepareSeoRewrite/);
  assert.doesNotMatch(approvalSection, /return applySeoMetadataChange/);
});

test('automatic status polling can only resume and cannot start a paid generation', () => {
  assert.match(progressRouteSource, /prepareSeoRewrite\(pidChange, \{ allowStart: false \}\)/);
  assert.doesNotMatch(progressRouteSource, /startOpenAiRewrite/);
});

test('local GSC imports never depend on a fixed localhost port', () => {
  const workflow = `${gscAdminRouteSource}\n${gscImportControlSource}`;
  assert.doesNotMatch(workflow, /localhost:\d+/);
  assert.doesNotMatch(workflow, /SEO_IMPORT_SERVICE_URL/);
  assert.match(gscImportControlSource, /Current public app origin/);
  assert.match(gscImportControlSource, /gsc-public-service-origin/);
});

test('an article with a draft in progress cannot spend credits through another query', () => {
  assert.match(opportunityDraftSource, /WHERE pidBlog = \$\{context\.pidBlog\}/);
  assert.match(opportunityDraftSource, /status NOT IN \('applied', 'rejected'\)/);
  assert.match(opportunityDraftSource, /already has a saved SEO change/);
  assert.match(seoQueueSource, /changeLog\.pidBlog = selectedBlog\.pidBlog/);
  assert.match(seoQueueSource, /sibling\.status = 'dismissed'/);
});
