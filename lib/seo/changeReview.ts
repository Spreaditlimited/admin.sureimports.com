import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

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
  const nextBlogContent = upsertGeneratedFaqSection(change.blogContent, buildFaqHtml(after.faq, change.pidChange))
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
