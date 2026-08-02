import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

const sureImportsInternalLinkCatalog = [
  {
    label: "Supplier Intelligence",
    url: "/supplier-intelligence",
    useWhen:
      "Readers need supplier leads, product category research, supplier checks, quote review, invoice review, or help reducing supplier risk before payment. Prioritize this link in most China sourcing and importing articles where it fits naturally.",
  },
  {
    label: "Corporate Sourcing",
    url: "/corporate-gifts",
    useWhen:
      "Readers need Sure Imports to find suppliers, compare manufacturers, handle bulk sourcing, custom production, product comparison, or quote/cost review.",
  },
  {
    label: "Buy From Chinese Websites",
    url: "/buy-from-chinese-websites",
    useWhen:
      "Readers already have product links from 1688, Taobao, Tmall or another Chinese website and need Sure Imports to buy on their behalf.",
  },
  {
    label: "LineScout",
    url: "https://linescout.sureimports.com/",
    useWhen:
      "Readers are sourcing machines, equipment, production lines, industrial tools, or technical machinery from China.",
  },
  {
    label: "Ship With Us",
    url: "/ship-with-us",
    useWhen:
      "Readers already have goods or a supplier and mainly need China-to-Nigeria shipping, warehouse receiving, consolidation, or freight support.",
  },
  {
    label: "Import Hub",
    url: "/import-from-china-to-nigeria",
    useWhen:
      "Readers need a broad learning path for importing from China to Nigeria, calculators, guides, tools and next steps.",
  },
]

const approvedSureImportsUrls = new Set(
  sureImportsInternalLinkCatalog.map((item) => item.url),
)

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
}

export interface ParsedSeoChangeReview extends SeoChangeReviewRow {
  before: Record<string, any>
  after: Record<string, any>
  validation: Record<string, any>
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

function approvedInternalLinks(value: unknown) {
  return normalizeObjectList(value).filter((item: any) =>
    typeof item.url === "string" && approvedSureImportsUrls.has(item.url),
  )
}

function validateRewrittenLinks(html: string) {
  const hrefPattern = /\shref=(["'])(.*?)\1/gi
  const invalidServiceUrls: string[] = []
  const inferredServiceUrlPattern =
    /^\/(?:import-hub|corporate-sourcing|linescout|supplier-intelligence-service|import-hub-page)(?:\/|$)/i

  for (const match of html.matchAll(hrefPattern)) {
    const url = String(match[2] || "").trim()
    if (inferredServiceUrlPattern.test(url)) invalidServiceUrls.push(url)
  }

  if (invalidServiceUrls.length > 0) {
    throw new Error(
      `AI rewrite produced unapproved inferred service link(s): ${[
        ...new Set(invalidServiceUrls),
      ].join(", ")}.`,
    )
  }
}

const contentRewriteSchema = {
  type: "object",
  properties: {
    html: { type: "string" },
    appliedChanges: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["html", "appliedChanges"],
  additionalProperties: false,
}

function buildRewritePrompt(change: ParsedSeoChangeReview, after: Record<string, any>) {
  const contentBrief = normalizeStringList(after.contentBrief)
  const internalLinks = approvedInternalLinks(after.internalLinks)
  const riskNotes = normalizeStringList(after.riskNotes)
  const cleanContent = removeGeneratedFaqSection(change.blogContent)

  return `
Rewrite and improve this Sure Imports blog post HTML using the approved SEO content brief.

Critical rules:
- Return only valid JSON with this shape: {"html":"full rewritten article HTML","appliedChanges":["short summary"]}.
- Apply every useful contentBrief item directly in the article body.
- Preserve the original article intent, audience and factual meaning.
- Do not invent prices, customs rates, years, supplier lists, official claims, laws, market statistics, warranty terms, machine budgets, or guaranteed outcomes.
- If the brief asks to verify a claim and the current article does not provide proof, soften the claim instead of pretending it was verified.
- Keep the language simple, practical and written for Nigerian importers buying from China.
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
${sureImportsInternalLinkCatalog
  .map((item, index) => `${index + 1}. ${item.label}: ${item.url} - ${item.useWhen}`)
  .join("\n")}

Risk notes:
${riskNotes.map((item, index) => `${index + 1}. ${item}`).join("\n") || "No risk notes supplied."}

Current blog:
- title: ${change.blogTitle || "Untitled"}
- slug: ${change.blogSlug || "unknown"}

Current article HTML:
${truncate(cleanContent, 70000)}
`.trim()
}

async function rewriteBlogContentWithAi(change: ParsedSeoChangeReview, after: Record<string, any>) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in admin environment.")
  }

  const model = process.env.SEO_CONTENT_REWRITE_MODEL || process.env.SEO_AUTOMATION_MODEL || process.env.OPENAI_MODEL || "gpt-5.5"
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
            "You are a senior Sure Imports editor. Rewrite existing blog HTML conservatively, apply approved SEO recommendations, and never invent unsupported facts.",
        },
        { role: "user", content: buildRewritePrompt(change, after) },
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

  const payload = await response.json()
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
  validateRewrittenLinks(html)

  return html
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
        o.recommendedCta
      FROM seo_content_change_logs c
      LEFT JOIN blog b ON b.pidBlog = c.pidBlog
      LEFT JOIN seo_opportunities o ON o.pidOpportunity = c.pidOpportunity
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
  }
}

export async function rejectSeoChange(pidChange: string) {
  const now = new Date()
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE seo_content_change_logs
      SET status = 'rejected',
          updatedAt = ${now}
      WHERE pidChange = ${pidChange}
        AND status IN ('draft', 'reviewing')
    `,
  )
}

export async function applySeoMetadataChange(pidChange: string) {
  const change = await getSeoChangeReview(pidChange)
  if (!change) throw new Error("SEO draft was not found.")
  if (!change.pidBlog) throw new Error("SEO draft is not attached to a blog post.")
  if (change.status === "rejected") throw new Error("SEO draft has been rejected.")

  const after = change.after || {}
  const metaTitle = typeof after.metaTitle === "string" ? after.metaTitle.trim() : ""
  const metaDescription = typeof after.metaDescription === "string" ? after.metaDescription.trim() : ""
  const focusKeyword = typeof after.focusKeyword === "string" ? after.focusKeyword.trim() : ""

  if (!metaTitle || !metaDescription || !focusKeyword) {
    throw new Error("SEO draft is missing meta title, description, or focus keyword.")
  }

  const existingSeo = parseSeoData(change.blogExt2)
  const rewrittenContent = await rewriteBlogContentWithAi(change, after)
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
            publishedAt = ${now},
            updatedAt = ${now}
        WHERE pidChange = ${pidChange}
      `,
    ),
    prisma.$executeRaw(
      Prisma.sql`
        UPDATE seo_opportunities
        SET status = 'applied',
            updatedAt = ${now}
        WHERE pidOpportunity = ${change.pidOpportunity}
      `,
    ),
  ])
}
