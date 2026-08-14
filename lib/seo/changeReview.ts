import crypto from "crypto"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import {
  extractExternalUrls,
  validateExternalLinkContinuity,
  type ExternalLinkChange,
} from "@/lib/seo/externalLinkPolicy"
import { getSeoLinkCatalog, type SeoLinkCatalogItem } from "@/lib/seo/linkCatalog"
import {
  findNewUnapprovedLinks,
  normalizeLinkableUrl,
  type LinkApprovalDecision,
} from "@/lib/seo/linkPolicy"

export const SEO_REWRITE_QUALITY_POLICY_VERSION = "2026-08-external-research-global-v1"

export interface SeoChangeReviewRow {
  pidChange: string
  pidOpportunity: string | null
  pidBlog: string | null
  changeType: string
  status: string
  beforeJson: string | null
  afterJson: string | null
  validationJson: string | null
  publishedAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
  blogTitle: string | null
  blogSlug: string | null
  blogContent: string | null
  blogExt2: string | null
  pageUrl: string | null
  opportunityType: string | null
  primaryQuery: string | null
  recommendation: string | null
  recommendedCta: string | null
  artifactStatus: string | null
  sourceContentHash: string | null
  rewrittenHtml: string | null
  appliedChangesJson: string | null
  discoveredLinksJson: string | null
  pendingLinksJson: string | null
  decisionsJson: string | null
  externalLinkChangesJson: string | null
  qualityPolicyVersion: string | null
  openAiResponseId: string | null
  openAiResponseStatus: string | null
  openAiModel: string | null
  artifactErrorCode: string | null
  artifactErrorMessage: string | null
  rewriteAttemptCount: number | null
  rewriteGeneratedAt: Date | null
  rewriteStartedAt: Date | null
}

export interface ParsedSeoChangeReview extends SeoChangeReviewRow {
  before: Record<string, any>
  after: Record<string, any>
  validation: Record<string, any>
  appliedChanges: string[]
  discoveredLinks: string[]
  pendingLinks: string[]
  linkDecisions: Record<string, LinkApprovalDecision>
  externalLinkChanges: ExternalLinkChange[]
  rewritePolicyCurrent: boolean
}

function parseJsonObject(value: string | null) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

function parseJsonArray(value: string | null) {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseSeoData(value: string | null) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return { metaDescription: value }
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

function extractJsonObject(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed

  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not include a JSON object.")
  }
  return trimmed.slice(start, end + 1)
}

function normalizeKeywords(value: unknown, focusKeyword: string) {
  const keywords = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
  if (focusKeyword && !keywords.some((item) => item.toLowerCase() === focusKeyword.toLowerCase())) {
    keywords.unshift(focusKeyword)
  }
  return keywords.slice(0, 10)
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildFaqHtml(faq: unknown, pidChange: string) {
  const items = Array.isArray(faq)
    ? faq
        .map((item) => ({
          question: typeof item?.question === "string" ? item.question.trim() : "",
          answer: typeof item?.answer === "string" ? item.answer.trim() : "",
        }))
        .filter((item) => item.question && item.answer)
    : []

  if (items.length === 0) return null

  const body = items
    .map(
      (item) => `
        <div class="sureimports-seo-faq-item">
          <h3>${escapeHtml(item.question)}</h3>
          <p>${escapeHtml(item.answer)}</p>
        </div>
      `,
    )
    .join("\n")

  return `
<!-- sureimports-seo-faq:start:${pidChange} -->
<section class="sureimports-seo-faq" data-seo-change="${escapeHtml(pidChange)}">
  <h2>Frequently Asked Questions</h2>
  ${body}
</section>
<!-- sureimports-seo-faq:end -->
`.trim()
}

function upsertGeneratedFaqSection(content: string | null, faqHtml: string | null) {
  const current = String(content || "").trim()
  if (!faqHtml) return current

  const markerPattern = /<!-- sureimports-seo-faq:start:[\s\S]*?<!-- sureimports-seo-faq:end -->/g
  const cleaned = current.replace(markerPattern, "").trim()
  return `${cleaned}\n\n${faqHtml}`.trim()
}

function removeGeneratedFaqSection(content: string | null) {
  const current = String(content || "").trim()
  const markerPattern = /<!-- sureimports-seo-faq:start:[\s\S]*?<!-- sureimports-seo-faq:end -->/g
  return current.replace(markerPattern, "").trim()
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : []
}

function normalizeObjectList(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((item) => (item && typeof item === "object" ? item : null))
        .filter(Boolean)
    : []
}

function approvedInternalLinks(value: unknown, approvedUrls: Set<string>) {
  return normalizeObjectList(value).filter((item: any) =>
    typeof item.url === "string" && approvedUrls.has(item.url),
  )
}

const contentRewriteSchema = {
  type: "object",
  properties: {
    html: { type: "string" },
    appliedChanges: {
      type: "array",
      items: { type: "string" },
    },
    externalLinkChanges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          originalUrl: { type: "string" },
          action: { type: "string", enum: ["retained", "replaced"] },
          replacementUrl: { type: "string" },
          reason: { type: "string" },
        },
        required: ["originalUrl", "action", "replacementUrl", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["html", "appliedChanges", "externalLinkChanges"],
  additionalProperties: false,
}

function buildRewritePrompt(
  change: ParsedSeoChangeReview,
  after: Record<string, any>,
  linkCatalog: SeoLinkCatalogItem[],
) {
  const contentBrief = normalizeStringList(after.contentBrief)
  const approvedUrls = new Set(linkCatalog.map((item) => item.url))
  const internalLinks = approvedInternalLinks(after.internalLinks, approvedUrls)
  const riskNotes = normalizeStringList(after.riskNotes)
  const cleanContent = removeGeneratedFaqSection(change.blogContent)
  const existingExternalLinks = extractExternalUrls(cleanContent)

  return `
Rewrite and improve this Sure Imports blog post HTML using the approved SEO content brief.

Critical rules:
- Return only valid JSON matching the requested schema, including the full article HTML, a concise change summary, and an externalLinkChanges audit.
- Apply every useful contentBrief item directly in the article body.
- Produce a substantially better researched, clearer and more useful article while preserving valuable original material, intent and factual meaning.
- Do not summarize the article into a shorter substitute. Preserve its useful depth, examples, steps, warnings, media and reference context while improving structure and prose.
- Do not invent prices, customs rates, years, supplier lists, official claims, laws, market statistics, warranty terms, machine budgets, or guaranteed outcomes.
- If the brief asks to verify a claim and the current article does not provide proof, soften the claim instead of pretending it was verified.
- Use web research for claims, recommendations and citations that can be improved or may have changed. Prefer official and primary sources, then highly authoritative specialist sources.
- Never fabricate a citation or URL. Every new external link must be relevant to the sentence it supports and must come from research actually performed.
- Preserve every useful existing external link. Never remove an external link merely because it points away from Sure Imports.
- Replace an existing external link only when research shows that it is broken, outdated, less authoritative or less relevant. A replacement must appear in the rewritten HTML, and externalLinkChanges must record the original URL, action, replacement URL and reason.
- For retained links, include an externalLinkChanges entry with action "retained", an empty replacementUrl, and a short reason.
- Add new authoritative external citations when they materially help readers verify a claim, use an official service, understand a rule, or continue their research.
- Write primarily for Nigerian importers buying from China, but make every article valuable to readers outside Nigeria too: explain Nigerian-specific terms and conditions, distinguish local rules from general principles, and surface globally transferable sourcing, verification, costing and risk-management lessons.
- Do not dilute Nigerian relevance. Use Nigeria as the primary market context while providing enough framing, comparisons and general guidance for international readers.
- Keep the language simple, practical, specific and editorially polished. Avoid filler, repetition, generic motivational prose and shallow list expansion.
- Keep valid HTML only. Use headings, paragraphs, lists and links. Do not include markdown fences.
- Do not include a FAQ section; the system appends the approved FAQ separately.
- Add internal links naturally only when relevant.
- Use only exact URLs from the approved link catalog or approved internal link suggestions. Do not invent URLs from service names.
- Import Hub must use /import-from-china-to-nigeria, not /import-hub.
- Corporate Sourcing must use /corporate-sourcing, not /corporate-gifts.
- LineScout must use https://linescout.sureimports.com/, not /linescout.
- Prioritize Supplier Intelligence whenever the article discusses finding suppliers, checking suppliers, choosing product categories, requesting quotes, avoiding scams, supplier contact, MOQ, invoices, or payment risk.
- If adding a CTA, use an exact URL from the approved link catalog, approved internal link suggestions, or approved CTA intent.
- Do not change the blog title unless the existing article body already contains it as a heading.

Approved metadata:
- meta title: ${after.metaTitle || ""}
- meta description: ${after.metaDescription || ""}
- focus keyword: ${after.focusKeyword || ""}
- CTA intent: ${after.ctaIntent || change.recommendedCta || ""}

Content brief to apply:
${contentBrief.map((item, index) => `${index + 1}. ${item}`).join("\n") || "No content brief supplied."}

Internal link suggestions:
${internalLinks
  .map((item: any, index) => `${index + 1}. ${item.label || ""} - ${item.url || ""} (${item.reason || ""})`)
  .join("\n") || "No internal links supplied."}

Approved Sure Imports link catalog:
${linkCatalog
  .map((item, index) => `${index + 1}. ${item.label}: ${item.url} - ${item.useWhen}`)
  .join("\n")}

Risk notes:
${riskNotes.map((item, index) => `${index + 1}. ${item}`).join("\n") || "No risk notes supplied."}

Existing external links that must be retained or explicitly replaced:
${existingExternalLinks.map((url, index) => `${index + 1}. ${url}`).join("\n") || "The current article has no external links. Add authoritative external citations when they materially improve reader value."}

Current blog:
- title: ${change.blogTitle || "Untitled"}
- slug: ${change.blogSlug || "unknown"}

Current article HTML:
${cleanContent}
`.trim()
}

function getOpenAiApiKey() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in admin environment.")
  return apiKey
}

function parseCompletedRewriteResponse(
  payload: any,
  change: ParsedSeoChangeReview,
) {
  if (payload?.status !== "completed") {
    throw new Error(`OpenAI rewrite is not complete (status: ${payload?.status || "unknown"}).`)
  }

  const content =
    typeof payload?.output_text === "string"
      ? payload.output_text
      : payload?.output
          ?.flatMap((item: any) => item?.content || [])
          ?.map((item: any) => item?.text)
          ?.filter((item: unknown): item is string => typeof item === "string")
          ?.join("")

  if (typeof content !== "string") throw new Error("OpenAI response did not include rewritten content.")

  const parsed = JSON.parse(extractJsonObject(content))
  const html = typeof parsed.html === "string" ? parsed.html.trim() : ""
  if (!html || html.length < 500) {
    throw new Error("AI rewrite returned content that is too short to apply safely.")
  }
  const externalLinkChanges = Array.isArray(parsed.externalLinkChanges)
    ? parsed.externalLinkChanges.filter(
        (item: any): item is ExternalLinkChange =>
          item &&
          typeof item.originalUrl === "string" &&
          (item.action === "retained" || item.action === "replaced") &&
          typeof item.replacementUrl === "string" &&
          typeof item.reason === "string",
      )
    : []
  validateExternalLinkContinuity({
    originalHtml: change.blogContent,
    rewrittenHtml: html,
    changes: externalLinkChanges,
  })
  return {
    html,
    appliedChanges: normalizeStringList(parsed.appliedChanges),
    externalLinkChanges,
  }
}

async function startOpenAiRewrite(
  change: ParsedSeoChangeReview,
  after: Record<string, any>,
  linkCatalog: SeoLinkCatalogItem[],
  idempotencyKey: string,
) {
  const apiKey = getOpenAiApiKey()
  const model = process.env.SEO_CONTENT_REWRITE_MODEL || "gpt-5.6-sol"
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      model,
      background: true,
      reasoning: { effort: "high" },
      tools: [{ type: "web_search" }],
      max_tool_calls: 6,
      max_output_tokens: 40_000,
      input: [
        {
          role: "system",
          content:
            "You are Sure Imports' senior research editor. Produce authoritative, deeply useful article rewrites grounded in current research. Preserve or deliberately improve external citations, balance Nigeria-first relevance with value for international readers, apply approved SEO recommendations, and never invent unsupported facts or links.",
        },
        { role: "user", content: buildRewritePrompt(change, after, linkCatalog) },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sureimports_content_rewrite",
          schema: contentRewriteSchema,
          strict: true,
        },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI content rewrite failed: ${response.status} ${truncate(body, 240)}`)
  }

  return response.json()
}

async function retrieveOpenAiRewrite(responseId: string) {
  const response = await fetch(
    `https://api.openai.com/v1/responses/${encodeURIComponent(responseId)}`,
    {
      headers: { Authorization: `Bearer ${getOpenAiApiKey()}` },
      signal: AbortSignal.timeout(30_000),
    },
  )
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI rewrite status check failed: ${response.status} ${truncate(body, 240)}`)
  }
  return response.json()
}

export async function getSeoChangeReview(pidChange: string): Promise<ParsedSeoChangeReview | null> {
  const rows = await prisma.$queryRaw<SeoChangeReviewRow[]>(
    Prisma.sql`
      SELECT
        c.pidChange,
        c.pidOpportunity,
        c.pidBlog,
        c.changeType,
        c.status,
        c.beforeJson,
        c.afterJson,
        c.validationJson,
        c.publishedAt,
        c.createdAt,
        c.updatedAt,
        b.blogTitle,
        b.blogSlug,
        b.blogContent,
        b.blogExt2,
        o.pageUrl,
        o.opportunityType,
        o.primaryQuery,
        o.recommendation,
        o.recommendedCta,
        a.status AS artifactStatus,
        a.sourceContentHash,
        a.rewrittenHtml,
        a.appliedChangesJson,
        a.discoveredLinksJson,
        a.pendingLinksJson,
        a.decisionsJson,
        a.externalLinkChangesJson,
        a.qualityPolicyVersion,
        a.openAiResponseId,
        a.openAiResponseStatus,
        a.openAiModel,
        a.errorCode AS artifactErrorCode,
        a.errorMessage AS artifactErrorMessage,
        a.attemptCount AS rewriteAttemptCount,
        a.generatedAt AS rewriteGeneratedAt,
        (
          SELECT pa.startedAt
          FROM seo_change_pipeline_attempts pa
          WHERE pa.pidChange = c.pidChange
            AND pa.stage = 'rewrite'
            AND pa.status = 'started'
          ORDER BY pa.createdAt DESC
          LIMIT 1
        ) AS rewriteStartedAt
      FROM seo_content_change_logs c
      LEFT JOIN blog b ON b.pidBlog = c.pidBlog
      LEFT JOIN seo_opportunities o ON o.pidOpportunity = c.pidOpportunity
      LEFT JOIN seo_change_rewrite_artifacts a ON a.pidChange = c.pidChange
      WHERE c.pidChange = ${pidChange}
      LIMIT 1
    `,
  )

  const row = rows[0]
  if (!row) return null

  return {
    ...row,
    before: parseJsonObject(row.beforeJson),
    after: parseJsonObject(row.afterJson),
    validation: parseJsonObject(row.validationJson),
    appliedChanges: normalizeStringList(parseJsonArray(row.appliedChangesJson)),
    discoveredLinks: normalizeStringList(parseJsonArray(row.discoveredLinksJson)),
    pendingLinks: normalizeStringList(parseJsonArray(row.pendingLinksJson)),
    linkDecisions: parseJsonObject(row.decisionsJson) as Record<string, LinkApprovalDecision>,
    externalLinkChanges: parseJsonArray(row.externalLinkChangesJson) as ExternalLinkChange[],
    rewritePolicyCurrent: row.qualityPolicyVersion === SEO_REWRITE_QUALITY_POLICY_VERSION,
  }
}

export async function rejectSeoChange(pidChange: string) {
  const now = new Date()
  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = 'rejected', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
          AND status IN ('draft', 'reviewing', 'rewriting', 'rewrite_ready', 'rewrite_failed', 'apply_failed', 'awaiting_link_review')
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET status = 'rejected', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
          AND status <> 'applied'
      `,
    ),
  ])
}

function contentHash(content: string | null) {
  return crypto.createHash("sha256").update(String(content || "")).digest("hex")
}

function linkLabel(url: string) {
  const path = url.startsWith("http") ? new URL(url).pathname : url
  const part = path.split("/").filter(Boolean).pop() || "Approved page"
  return part
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

async function markRewriteStarted(pidChange: string, sourceContentHash: string) {
  const now = new Date()
  const pidAttempt = `seo_attempt_${crypto.randomUUID()}`
  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO seo_change_rewrite_artifacts (
          pidArtifact, pidChange, sourceContentHash, status, attemptCount, createdAt, updatedAt
        ) VALUES (
          ${`seo_artifact_${crypto.randomUUID()}`}, ${pidChange}, ${sourceContentHash},
          'rewriting', 1, ${now}, ${now}
        )
        ON DUPLICATE KEY UPDATE
          sourceContentHash = VALUES(sourceContentHash),
          rewrittenHtml = NULL,
          appliedChangesJson = NULL,
          discoveredLinksJson = NULL,
          pendingLinksJson = NULL,
          decisionsJson = NULL,
          externalLinkChangesJson = NULL,
          qualityPolicyVersion = NULL,
          openAiResponseId = NULL,
          openAiResponseStatus = NULL,
          openAiModel = NULL,
          status = 'rewriting',
          errorCode = NULL,
          errorMessage = NULL,
          generatedAt = NULL,
          reviewedAt = NULL,
          appliedAt = NULL,
          attemptCount = attemptCount + 1,
          updatedAt = VALUES(updatedAt)
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = 'rewriting', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO seo_change_pipeline_attempts (
          pidAttempt, pidChange, stage, status, detailsJson, startedAt, createdAt, updatedAt
        ) VALUES (
          ${pidAttempt}, ${pidChange}, 'rewrite', 'started',
          ${JSON.stringify({ sourceContentHash })}, ${now}, ${now}, ${now}
        )
      `,
    ),
  ])
  return pidAttempt
}

async function getActiveRewriteAttemptId(pidChange: string) {
  const rows = await prisma.$queryRaw<Array<{ pidAttempt: string }>>(
    Prisma.sql`
      SELECT pidAttempt
      FROM seo_change_pipeline_attempts
      WHERE pidChange = ${pidChange}
        AND stage = 'rewrite'
        AND status = 'started'
      ORDER BY createdAt DESC
      LIMIT 1
    `,
  )
  return rows[0]?.pidAttempt || null
}

async function checkpointOpenAiRewrite(input: {
  pidChange: string
  pidAttempt: string
  responseId: string
  responseStatus: string
  model: string
}) {
  const now = new Date()
  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET openAiResponseId = ${input.responseId},
            openAiResponseStatus = ${input.responseStatus},
            openAiModel = ${input.model},
            status = 'rewriting',
            updatedAt = ${now}
        WHERE pidChange = ${input.pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_pipeline_attempts
        SET detailsJson = ${JSON.stringify({
          openAiResponseId: input.responseId,
          openAiResponseStatus: input.responseStatus,
          model: input.model,
        })},
            updatedAt = ${now}
        WHERE pidAttempt = ${input.pidAttempt}
      `,
    ),
  ])
}

async function markRewriteFailed(pidChange: string, pidAttempt: string, error: unknown) {
  const now = new Date()
  const message = error instanceof Error ? error.message : "AI content rewrite failed."
  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET status = 'failed',
            errorCode = 'rewrite_failed',
            errorMessage = ${truncate(message, 2000)},
            updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = 'rewrite_failed', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_pipeline_attempts
        SET status = 'failed',
            errorCode = 'rewrite_failed',
            errorMessage = ${truncate(message, 2000)},
            completedAt = ${now},
            updatedAt = ${now}
        WHERE pidAttempt = ${pidAttempt}
      `,
    ),
  ])
}

async function markApplyFailed(pidChange: string, pidAttempt: string, error: unknown) {
  const now = new Date()
  const message = error instanceof Error ? error.message : "Saving the SEO change failed."
  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET status = 'apply_failed',
            errorCode = 'apply_failed',
            errorMessage = ${truncate(message, 2000)},
            updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = 'apply_failed', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_pipeline_attempts
        SET status = 'failed',
            errorCode = 'apply_failed',
            errorMessage = ${truncate(message, 2000)},
            completedAt = ${now},
            updatedAt = ${now}
        WHERE pidAttempt = ${pidAttempt}
      `,
    ),
  ])
}

async function startApplyAttempt(pidChange: string, sourceContentHash: string) {
  const now = new Date()
  const pidAttempt = `seo_attempt_${crypto.randomUUID()}`
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO seo_change_pipeline_attempts (
        pidAttempt, pidChange, stage, status, detailsJson, startedAt, createdAt, updatedAt
      ) VALUES (
        ${pidAttempt}, ${pidChange}, 'apply', 'started',
        ${JSON.stringify({ sourceContentHash })}, ${now}, ${now}, ${now}
      )
    `,
  )
  return pidAttempt
}

async function saveRewriteArtifact(input: {
  pidChange: string
  html: string
  appliedChanges: string[]
  externalLinkChanges: ExternalLinkChange[]
  discoveredLinks: string[]
  pendingLinks: string[]
  decisions: Record<string, LinkApprovalDecision>
  rewriteAttemptId?: string
}) {
  const now = new Date()
  const status = input.pendingLinks.length > 0 ? "awaiting_link_review" : "ready"
  const changeStatus = input.pendingLinks.length > 0 ? "awaiting_link_review" : "rewrite_ready"
  const operations = [
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET rewrittenHtml = ${input.html},
            appliedChangesJson = ${JSON.stringify(input.appliedChanges)},
            externalLinkChangesJson = ${JSON.stringify(input.externalLinkChanges)},
            qualityPolicyVersion = ${SEO_REWRITE_QUALITY_POLICY_VERSION},
            openAiResponseStatus = 'completed',
            discoveredLinksJson = ${JSON.stringify(input.discoveredLinks)},
            pendingLinksJson = ${JSON.stringify(input.pendingLinks)},
            decisionsJson = ${JSON.stringify(input.decisions)},
            status = ${status},
            errorCode = NULL,
            errorMessage = NULL,
            generatedAt = COALESCE(generatedAt, ${now}),
            reviewedAt = ${input.pendingLinks.length === 0 ? now : null},
            updatedAt = ${now}
        WHERE pidChange = ${input.pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = ${changeStatus}, updatedAt = ${now}
        WHERE pidChange = ${input.pidChange}
      `,
    ),
  ]

  if (input.rewriteAttemptId) {
    operations.push(
      prisma.$executeRaw(
        Prisma.sql`
          UPDATE seo_change_pipeline_attempts
          SET status = 'completed',
              detailsJson = ${JSON.stringify({
                discoveredLinks: input.discoveredLinks,
                pendingLinks: input.pendingLinks,
                externalLinkChanges: input.externalLinkChanges,
                qualityPolicyVersion: SEO_REWRITE_QUALITY_POLICY_VERSION,
              })},
              completedAt = ${now},
              updatedAt = ${now}
          WHERE pidAttempt = ${input.rewriteAttemptId}
        `,
      ),
    )
  }

  await prisma.$transaction(operations)
}

async function finalizeSeoChange(
  change: ParsedSeoChangeReview,
  rewrittenContent: string,
  applyAttemptId: string,
) {
  const after = change.after || {}
  const metaTitle = typeof after.metaTitle === "string" ? after.metaTitle.trim() : ""
  const metaDescription = typeof after.metaDescription === "string" ? after.metaDescription.trim() : ""
  const focusKeyword = typeof after.focusKeyword === "string" ? after.focusKeyword.trim() : ""

  if (!metaTitle || !metaDescription || !focusKeyword) {
    throw new Error("SEO draft is missing meta title, description, or focus keyword.")
  }

  const existingSeo = parseSeoData(change.blogExt2)
  const nextBlogContent = upsertGeneratedFaqSection(rewrittenContent, buildFaqHtml(after.faq, change.pidChange))
  const nextSeo = {
    ...existingSeo,
    metaTitle,
    seoTitle: metaTitle,
    metaDescription,
    focusKeyword,
    keywords: normalizeKeywords((existingSeo as any).keywords, focusKeyword),
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    twitterTitle: metaTitle,
    twitterDescription: metaDescription,
  }
  const now = new Date()
  const beforeSnapshot = {
    ...change.before,
    blogContent: change.blogContent,
    blogExt2: change.blogExt2,
    capturedAt: now.toISOString(),
  }

  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE blog
        SET blogContent = ${nextBlogContent},
            blogExt2 = ${JSON.stringify(nextSeo)},
            updatedAt = ${now}
        WHERE pidBlog = ${change.pidBlog}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = 'applied',
            beforeJson = ${JSON.stringify(beforeSnapshot)},
            publishedAt = ${now},
            updatedAt = ${now}
        WHERE pidChange = ${change.pidChange}
          AND status <> 'applied'
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET status = 'applied', appliedAt = ${now}, updatedAt = ${now}
        WHERE pidChange = ${change.pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_opportunities
        SET status = 'applied', updatedAt = ${now}
        WHERE pidOpportunity = ${change.pidOpportunity}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_pipeline_attempts
        SET status = 'completed',
            detailsJson = ${JSON.stringify({ publishedAt: now.toISOString() })},
            completedAt = ${now},
            updatedAt = ${now}
        WHERE pidAttempt = ${applyAttemptId}
      `,
    ),
  ])
}

export type SeoApplyResult =
  | { status: "applied" | "already_applied"; pendingLinks: [] }
  | { status: "awaiting_link_review"; pendingLinks: string[] }

export type SeoRewritePreparationResult =
  | { status: "ready"; pendingLinks: [] }
  | { status: "awaiting_link_review"; pendingLinks: string[] }
  | { status: "processing"; pendingLinks: [] }

function assertReviewableChange(change: ParsedSeoChangeReview) {
  if (!change.pidBlog) throw new Error("SEO draft is not attached to a blog post.")
  if (change.status === "rejected") throw new Error("SEO draft has been rejected.")
  if (change.validation.ok === false) {
    throw new Error("Resolve the stored SEO draft validation errors before continuing.")
  }
}

export async function prepareSeoRewrite(
  pidChange: string,
  options: { allowStart?: boolean } = {},
): Promise<SeoRewritePreparationResult> {
  const change = await getSeoChangeReview(pidChange)
  if (!change) throw new Error("SEO draft was not found.")
  assertReviewableChange(change)
  if (change.status === "applied") throw new Error("This SEO draft has already been applied.")

  const linkCatalog = await getSeoLinkCatalog()
  const approvedUrls = linkCatalog.map((item) => item.url)
  const sourceContentHash = contentHash(change.blogContent)
  let rewrittenHtml = change.rewrittenHtml
  let appliedChanges = change.appliedChanges
  let externalLinkChanges = change.externalLinkChanges
  let decisions = change.linkDecisions
  let rewriteAttemptId: string | undefined

  const canResume =
    Boolean(rewrittenHtml) &&
    change.sourceContentHash === sourceContentHash &&
    change.rewritePolicyCurrent &&
    change.artifactStatus !== "discarded" &&
    change.artifactStatus !== "failed"
  const canResumeBackgroundResponse =
    Boolean(change.openAiResponseId) &&
    change.sourceContentHash === sourceContentHash &&
    change.artifactStatus === "rewriting"

  if (!canResume) {
    if (options.allowStart === false && !canResumeBackgroundResponse) {
      throw new Error("There is no matching background rewrite to resume.")
    }
    rewriteAttemptId =
      change.sourceContentHash === sourceContentHash && change.artifactStatus === "rewriting"
        ? await getActiveRewriteAttemptId(pidChange) || undefined
        : undefined
    if (!rewriteAttemptId) {
      rewriteAttemptId = await markRewriteStarted(pidChange, sourceContentHash)
    }

    try {
      const payload =
        canResumeBackgroundResponse && change.openAiResponseId
          ? await retrieveOpenAiRewrite(change.openAiResponseId)
          : await startOpenAiRewrite(
              change,
              change.after || {},
              linkCatalog,
              rewriteAttemptId,
            )
      const responseId = typeof payload?.id === "string" ? payload.id : change.openAiResponseId
      const responseStatus = typeof payload?.status === "string" ? payload.status : "unknown"
      const model = typeof payload?.model === "string"
        ? payload.model
        : process.env.SEO_CONTENT_REWRITE_MODEL || "gpt-5.6-sol"

      if (!responseId) throw new Error("OpenAI background rewrite did not return a response ID.")
      await checkpointOpenAiRewrite({
        pidChange,
        pidAttempt: rewriteAttemptId,
        responseId,
        responseStatus,
        model,
      })

      if (responseStatus === "queued" || responseStatus === "in_progress") {
        return { status: "processing", pendingLinks: [] }
      }
      if (responseStatus !== "completed") {
        const detail = payload?.error?.message || payload?.incomplete_details?.reason || responseStatus
        throw new Error(`OpenAI background rewrite ended with ${responseStatus}: ${detail}`)
      }

      const rewrite = parseCompletedRewriteResponse(payload, change)
      rewrittenHtml = rewrite.html
      appliedChanges = rewrite.appliedChanges
      externalLinkChanges = rewrite.externalLinkChanges
      decisions = {}
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const transient =
        error instanceof TypeError ||
        error instanceof DOMException ||
        /fetch failed|status check failed: (?:429|5\d\d)/i.test(message)
      if (!transient) await markRewriteFailed(pidChange, rewriteAttemptId, error)
      throw error
    }
  }

  if (!rewrittenHtml) throw new Error("The saved rewrite artifact is missing its HTML content.")
  validateExternalLinkContinuity({
    originalHtml: change.blogContent,
    rewrittenHtml,
    changes: externalLinkChanges,
  })

  const linkReview = findNewUnapprovedLinks({
    originalHtml: change.blogContent,
    rewrittenHtml,
    approvedUrls,
    decisions,
  })

  await saveRewriteArtifact({
    pidChange,
    html: rewrittenHtml,
    appliedChanges,
    externalLinkChanges,
    discoveredLinks: linkReview.discovered,
    pendingLinks: linkReview.pending,
    decisions,
    rewriteAttemptId,
  })

  if (linkReview.pending.length > 0) {
    return { status: "awaiting_link_review", pendingLinks: linkReview.pending }
  }

  return { status: "ready", pendingLinks: [] }
}

export async function applySeoMetadataChange(pidChange: string): Promise<SeoApplyResult> {
  const change = await getSeoChangeReview(pidChange)
  if (!change) throw new Error("SEO draft was not found.")
  assertReviewableChange(change)
  if (change.status === "applied") return { status: "already_applied", pendingLinks: [] }

  const sourceContentHash = contentHash(change.blogContent)
  if (
    !change.rewrittenHtml ||
    change.sourceContentHash !== sourceContentHash ||
    !change.rewritePolicyCurrent ||
    change.artifactStatus === "discarded" ||
    change.artifactStatus === "failed"
  ) {
    throw new Error("Generate and review an article rewrite that meets the current research and link-preservation policy before applying this SEO draft.")
  }

  validateExternalLinkContinuity({
    originalHtml: change.blogContent,
    rewrittenHtml: change.rewrittenHtml,
    changes: change.externalLinkChanges,
  })

  const linkCatalog = await getSeoLinkCatalog()
  const linkReview = findNewUnapprovedLinks({
    originalHtml: change.blogContent,
    rewrittenHtml: change.rewrittenHtml,
    approvedUrls: linkCatalog.map((item) => item.url),
    decisions: change.linkDecisions,
  })

  await saveRewriteArtifact({
    pidChange,
    html: change.rewrittenHtml,
    appliedChanges: change.appliedChanges,
    externalLinkChanges: change.externalLinkChanges,
    discoveredLinks: linkReview.discovered,
    pendingLinks: linkReview.pending,
    decisions: change.linkDecisions,
  })

  if (linkReview.pending.length > 0) {
    return { status: "awaiting_link_review", pendingLinks: linkReview.pending }
  }

  const refreshedChange = await getSeoChangeReview(pidChange)
  if (!refreshedChange) throw new Error("SEO draft disappeared before it could be applied.")
  const applyAttemptId = await startApplyAttempt(pidChange, sourceContentHash)
  try {
    await finalizeSeoChange(refreshedChange, change.rewrittenHtml, applyAttemptId)
  } catch (error) {
    await markApplyFailed(pidChange, applyAttemptId, error)
    throw error
  }
  return { status: "applied", pendingLinks: [] }
}

export async function approveSeoRewriteLink(input: {
  pidChange: string
  url: string
  scope: LinkApprovalDecision
  approvedBy: string
}) {
  const normalizedUrl = normalizeLinkableUrl(input.url)
  if (!normalizedUrl) throw new Error("The selected link is not a valid Sure Imports URL.")

  const change = await getSeoChangeReview(input.pidChange)
  if (!change) throw new Error("SEO draft was not found.")
  if (change.status === "rejected" || change.status === "applied") {
    throw new Error(`Links cannot be approved for an ${change.status} SEO draft.`)
  }
  if (!change.pendingLinks.includes(normalizedUrl)) {
    throw new Error("That link is no longer awaiting approval.")
  }

  const decisions = { ...change.linkDecisions, [normalizedUrl]: input.scope }
  const now = new Date()
  const operations = [
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET decisionsJson = ${JSON.stringify(decisions)},
            reviewedAt = ${now},
            updatedAt = ${now}
        WHERE pidChange = ${input.pidChange}
      `,
    ),
  ]

  if (input.scope === "global") {
    operations.push(
      prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO seo_linkable_pages (
            pidLink, url, normalizedUrl, label, status, source,
            approvedBy, approvedAt, createdAt, updatedAt
          ) VALUES (
            ${`seo_link_${crypto.randomUUID()}`}, ${normalizedUrl}, ${normalizedUrl},
            ${linkLabel(normalizedUrl)}, 'active', 'admin', ${input.approvedBy},
            ${now}, ${now}, ${now}
          )
          ON DUPLICATE KEY UPDATE
            url = VALUES(url),
            label = VALUES(label),
            status = 'active',
            source = 'admin',
            approvedBy = VALUES(approvedBy),
            approvedAt = VALUES(approvedAt),
            updatedAt = VALUES(updatedAt)
        `,
      ),
    )
  }

  await prisma.$transaction(operations)
  return prepareSeoRewrite(input.pidChange)
}

export async function discardSeoRewrite(pidChange: string) {
  const change = await getSeoChangeReview(pidChange)
  if (!change) throw new Error("SEO draft was not found.")
  if (change.status === "rejected" || change.status === "applied") {
    throw new Error(`The rewrite cannot be discarded for an ${change.status} SEO draft.`)
  }
  const now = new Date()
  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_change_rewrite_artifacts
        SET status = 'discarded', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_content_change_logs
        SET status = 'draft', updatedAt = ${now}
        WHERE pidChange = ${pidChange}
          AND status <> 'applied'
      `,
    ),
  ])
}
