import crypto from "crypto"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"
import { getSeoLinkCatalog, type SeoLinkCatalogItem } from "@/lib/seo/linkCatalog"

interface OpportunityDraftContext {
  pidOpportunity: string
  pageUrl: string
  blogSlug: string | null
  opportunityType: string
  primaryQuery: string | null
  clicks: number
  impressions: number
  ctr: unknown
  position: unknown
  confidence: unknown
  recommendation: string | null
  recommendedCta: string | null
  pidBlog: string | null
  blogTitle: string | null
  blogContent: string | null
  blogExt2: string | null
}

interface SeoDraft {
  changeType?: string
  metaTitle?: string
  metaDescription?: string
  focusKeyword?: string
  faq?: Array<{ question?: string; answer?: string }>
  internalLinks?: Array<{ label?: string; url?: string; reason?: string }>
  contentBrief?: string[]
  ctaIntent?: string
  riskNotes?: string[]
  publishSafety?: {
    safeForAutoPublish?: boolean
    reason?: string
  }
}

const RULES_VERSION = "2026-06-27"

function stripHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

const seoDraftSchema = {
  type: "object",
  properties: {
    changeType: {
      type: "string",
      enum: ["meta_refresh", "content_refresh", "faq_addition"],
    },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    focusKeyword: { type: "string" },
    faq: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
        additionalProperties: false,
      },
    },
    internalLinks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
                url: { type: "string" },
          reason: { type: "string" },
        },
        required: ["label", "url", "reason"],
        additionalProperties: false,
      },
    },
    contentBrief: {
      type: "array",
      items: { type: "string" },
    },
    ctaIntent: { type: "string" },
    riskNotes: {
      type: "array",
      items: { type: "string" },
    },
    publishSafety: {
      type: "object",
      properties: {
        safeForAutoPublish: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["safeForAutoPublish", "reason"],
      additionalProperties: false,
    },
  },
  required: [
    "changeType",
    "metaTitle",
    "metaDescription",
    "focusKeyword",
    "faq",
    "internalLinks",
    "contentBrief",
    "ctaIntent",
    "riskNotes",
    "publishSafety",
  ],
  additionalProperties: false,
}

function buildPrompt(context: OpportunityDraftContext, linkCatalog: SeoLinkCatalogItem[]) {
  const seoData = parseSeoData(context.blogExt2)
  const articleText = truncate(stripHtml(context.blogContent), 7000)

  return `
You are the SureImports SEO operations assistant. Create a reviewable SEO improvement draft for an existing blog post.

Strict rules:
- Do not invent prices, customs rates, timelines, laws, supplier claims, payment guarantees, or live market statistics.
- Keep Nigeria and Nigerian buyers/importers sourcing from China as the primary market context.
- Make every recommendation useful to non-Nigerian readers too: ask the rewrite to explain Nigerian-specific terms, separate local requirements from general principles, and include globally transferable sourcing, verification, costing and risk-management lessons.
- Identify where current research or authoritative external sources would improve, verify or update the article. Existing useful external citations must be retained; outdated or weak citations may only be replaced with more authoritative and relevant sources.
- Encourage new external links to official or primary sources when they materially help readers verify claims or continue their research. External links are valuable editorial citations and must never be removed merely because they leave Sure Imports.
- The draft must be useful even if an editor only applies the metadata and FAQ suggestions.
- The CTA must match the searcher's intent and the recommended CTA.
- Internal links must come from the approved Sure Imports link catalog below. Do not invent URLs from service names.
- The URL value must exactly match one of the catalog URLs. For example, Import Hub must use /import-from-china-to-nigeria, not /import-hub.
- Prioritize Supplier Intelligence whenever the article discusses finding suppliers, checking suppliers, choosing product categories, requesting quotes, avoiding scams, supplier contact, MOQ, invoices, or payment risk.
- CTA routing: supplier_intelligence is for supplier leads, supplier checks, quote review, invoice review and category research; buy_from_chinese_websites is only for readers who already have Chinese website product links to submit; corporate_sourcing is for done-for-you supplier search, manufacturer research, product comparison, custom/bulk sourcing and clearer quote/cost review; linescout is for machines/equipment; ship_with_us is for shipping-only.
- Never mark this as ready for automatic publishing when the change would alter factual claims.

Approved Sure Imports internal link catalog:
${linkCatalog
  .map((item, index) => `${index + 1}. ${item.label}: ${item.url} - ${item.useWhen}`)
  .join("\n")}

Return only valid JSON with this exact shape:
{
  "changeType": "meta_refresh | content_refresh | faq_addition",
  "metaTitle": "string, maximum 65 characters",
  "metaDescription": "string, 120 to 160 characters",
  "focusKeyword": "string",
  "faq": [{"question": "string", "answer": "string"}],
  "internalLinks": [{"label": "string", "url": "exact URL from approved catalog", "reason": "string"}],
  "contentBrief": ["short editorial instruction"],
  "ctaIntent": "string",
  "riskNotes": ["string"],
  "publishSafety": {"safeForAutoPublish": false, "reason": "string"}
}

Opportunity:
- type: ${context.opportunityType}
- primary query: ${context.primaryQuery || "unknown"}
- clicks: ${Number(context.clicks || 0)}
- impressions: ${Number(context.impressions || 0)}
- CTR: ${Number(context.ctr || 0)}
- average position: ${Number(context.position || 0)}
- confidence: ${Number(context.confidence || 0)}
- recommendation: ${context.recommendation || "none"}
- recommended CTA: ${context.recommendedCta || "corporate_sourcing"}

Current blog:
- title: ${context.blogTitle || "Untitled"}
- slug: ${context.blogSlug || "unknown"}
- URL: ${context.pageUrl}
- current metaTitle: ${typeof (seoData as any).metaTitle === "string" ? (seoData as any).metaTitle : ""}
- current metaDescription: ${typeof (seoData as any).metaDescription === "string" ? (seoData as any).metaDescription : ""}
- current focusKeyword: ${typeof (seoData as any).focusKeyword === "string" ? (seoData as any).focusKeyword : ""}

Article text excerpt:
${articleText}
`.trim()
}

function validateDraft(draft: SeoDraft, approvedUrls: Set<string>) {
  const errors: string[] = []
  const warnings: string[] = []
  const allowedChangeTypes = ["meta_refresh", "content_refresh", "faq_addition"]

  if (!draft || typeof draft !== "object") errors.push("Draft is not an object.")
  if (!draft.metaTitle || draft.metaTitle.trim().length === 0) errors.push("Meta title is required.")
  if (draft.metaTitle && draft.metaTitle.length > 65) errors.push("Meta title must be 65 characters or fewer.")
  if (!draft.metaDescription || draft.metaDescription.trim().length === 0) errors.push("Meta description is required.")
  if (draft.metaDescription && (draft.metaDescription.length < 120 || draft.metaDescription.length > 160)) {
    errors.push("Meta description must be between 120 and 160 characters.")
  }
  if (!draft.focusKeyword || draft.focusKeyword.trim().length === 0) errors.push("Focus keyword is required.")
  if (!draft.changeType || !allowedChangeTypes.includes(draft.changeType)) {
    errors.push("Change type must be meta_refresh, content_refresh, or faq_addition.")
  }

  if (!Array.isArray(draft.faq) || draft.faq.length < 3 || draft.faq.length > 5) {
    errors.push("FAQ must include 3 to 5 questions.")
  } else {
    draft.faq.forEach((item, index) => {
      if (!item.question || !item.answer) errors.push(`FAQ item ${index + 1} needs a question and answer.`)
      if (item.answer && item.answer.length > 360) warnings.push(`FAQ item ${index + 1} answer is long.`)
    })
  }

  if (Array.isArray(draft.internalLinks)) {
    draft.internalLinks.forEach((link, index) => {
      if (!link.url || !approvedUrls.has(link.url)) {
        errors.push(`Internal link ${index + 1} must use an approved catalog URL.`)
      }
    })
  }

  if (draft.publishSafety?.safeForAutoPublish) {
    warnings.push("Draft requested auto-publish, but admin automation keeps generated changes in review.")
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    autoPublishAllowed: false,
    rulesVersion: RULES_VERSION,
  }
}

async function callOpenAi(prompt: string): Promise<SeoDraft> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in admin environment.")
  }

  const model = process.env.SEO_AUTOMATION_MODEL || process.env.OPENAI_MODEL || "gpt-5.5"
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "You create conservative, factual SEO drafts for SureImports. Return JSON only. Do not claim live facts unless supplied.",
        },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sureimports_seo_draft",
          schema: seoDraftSchema,
          strict: true,
        },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI draft request failed: ${response.status} ${truncate(body, 240)}`)
  }

  const payload = await response.json()
  const content =
    typeof payload?.output_text === "string"
      ? payload.output_text
      : payload?.output
          ?.flatMap((item: any) => item?.content || [])
          ?.map((item: any) => item?.text)
          ?.filter((item: unknown): item is string => typeof item === "string")
          ?.join("")

  if (typeof content !== "string") throw new Error("OpenAI response did not include draft content.")

  return JSON.parse(extractJsonObject(content))
}

export async function generateSeoDraftForOpportunity(pidOpportunity: string) {
  const rows = await prisma.$queryRaw<OpportunityDraftContext[]>(
    Prisma.sql`
      SELECT
        o.pidOpportunity,
        o.pageUrl,
        o.blogSlug,
        o.opportunityType,
        o.primaryQuery,
        o.clicks,
        o.impressions,
        o.ctr,
        o.position,
        o.confidence,
        o.recommendation,
        o.recommendedCta,
        b.pidBlog,
        b.blogTitle,
        b.blogContent,
        b.blogExt2
      FROM seo_opportunities o
      LEFT JOIN blog b ON b.blogSlug = o.blogSlug
      WHERE o.pidOpportunity = ${pidOpportunity}
      LIMIT 1
    `,
  )

  const context = rows[0]
  if (!context) throw new Error("SEO opportunity was not found.")
  if (!context.pidBlog) throw new Error("SEO opportunity is not matched to a blog post yet.")

  const linkCatalog = await getSeoLinkCatalog()
  const draft = await callOpenAi(buildPrompt(context, linkCatalog))
  const validation = validateDraft(draft, new Set(linkCatalog.map((item) => item.url)))
  const seoData = parseSeoData(context.blogExt2)
  const now = new Date()
  const pidChange = `seo_change_${crypto.randomUUID()}`

  await prisma.$transaction([
    prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO seo_content_change_logs (
          pidChange,
          pidOpportunity,
          pidBlog,
          changeType,
          status,
          beforeJson,
          afterJson,
          validationJson,
          createdAt,
          updatedAt
        ) VALUES (
          ${pidChange},
          ${context.pidOpportunity},
          ${context.pidBlog},
          ${draft.changeType || "seo_draft"},
          'draft',
          ${JSON.stringify({
            blogTitle: context.blogTitle,
            blogSlug: context.blogSlug,
            pageUrl: context.pageUrl,
            seoData,
          })},
          ${JSON.stringify(draft)},
          ${JSON.stringify(validation)},
          ${now},
          ${now}
        )
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_opportunities
        SET status = 'reviewing',
            updatedAt = ${now}
        WHERE pidOpportunity = ${context.pidOpportunity}
      `,
    ),
  ])

  return { pidChange, validation }
}
