import crypto from "crypto"
import { Prisma } from "@prisma/client"

import { prisma } from "@/lib/prisma"

interface BlogContextRow {
  pidBlog: string
  blogTitle: string
  blogSlug: string | null
  blogContent: string | null
  blogExt2: string | null
  primaryQuery: string | null
  recommendedCta: string | null
}

export interface BlogLeadMagnet {
  pidMagnet: string
  pidBlog: string
  blogSlug: string | null
  slug: string
  status: string
  title: string
  offerHeadline: string | null
  description: string | null
  buttonText: string | null
  bullets: string[]
  emailSubject: string | null
  deliveryMessage: string | null
  pdf: Record<string, any>
  recommendedCta: string | null
  sourceQuery: string | null
  model: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

interface LeadMagnetRow {
  pidMagnet: string
  pidBlog: string
  blogSlug: string | null
  slug: string
  status: string
  title: string
  offerHeadline: string | null
  description: string | null
  buttonText: string | null
  bulletsJson: string | null
  emailSubject: string | null
  deliveryMessage: string | null
  pdfJson: string | null
  recommendedCta: string | null
  sourceQuery: string | null
  model: string | null
  createdAt: Date | null
  updatedAt: Date | null
}

const leadMagnetSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    offerHeadline: { type: "string" },
    description: { type: "string" },
    buttonText: { type: "string" },
    bullets: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
    emailSubject: { type: "string" },
    deliveryMessage: { type: "string" },
    pdf: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        audience: { type: "string" },
        promise: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            properties: {
              heading: { type: "string" },
              items: { type: "array", items: { type: "string" } },
            },
            required: ["heading", "items"],
            additionalProperties: false,
          },
        },
        actionPlan: { type: "array", items: { type: "string" } },
        closingNote: { type: "string" },
        serviceCta: {
          type: "object",
          properties: {
            label: { type: "string" },
            headline: { type: "string" },
            body: { type: "string" },
            url: { type: "string" },
          },
          required: ["label", "headline", "body", "url"],
          additionalProperties: false,
        },
      },
      required: ["title", "subtitle", "audience", "promise", "sections", "actionPlan", "closingNote", "serviceCta"],
      additionalProperties: false,
    },
  },
  required: ["title", "offerHeadline", "description", "buttonText", "bullets", "emailSubject", "deliveryMessage", "pdf"],
  additionalProperties: false,
}

function clean(value: unknown, max = 1000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max)
}

function stripHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
}

function slugify(input: string) {
  return clean(input, 220)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function safeJsonParse(value: string | null, fallback: any) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function mapLeadMagnet(row: LeadMagnetRow | null | undefined): BlogLeadMagnet | null {
  if (!row) return null
  return {
    pidMagnet: row.pidMagnet,
    pidBlog: row.pidBlog,
    blogSlug: row.blogSlug,
    slug: row.slug,
    status: row.status,
    title: row.title,
    offerHeadline: row.offerHeadline,
    description: row.description,
    buttonText: row.buttonText,
    bullets: safeJsonParse(row.bulletsJson, []),
    emailSubject: row.emailSubject,
    deliveryMessage: row.deliveryMessage,
    pdf: safeJsonParse(row.pdfJson, {}),
    recommendedCta: row.recommendedCta,
    sourceQuery: row.sourceQuery,
    model: row.model,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

async function ensureBlogLeadMagnetTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS blog_lead_magnets (
      id INT NOT NULL AUTO_INCREMENT,
      pidMagnet VARCHAR(80) NOT NULL,
      pidBlog VARCHAR(80) NOT NULL,
      blogSlug VARCHAR(500) NULL,
      slug VARCHAR(255) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'draft',
      title VARCHAR(255) NOT NULL,
      offerHeadline VARCHAR(255) NULL,
      description TEXT NULL,
      buttonText VARCHAR(120) NULL,
      bulletsJson LONGTEXT NULL,
      emailSubject VARCHAR(255) NULL,
      deliveryMessage TEXT NULL,
      pdfJson LONGTEXT NULL,
      recommendedCta VARCHAR(120) NULL,
      sourceQuery VARCHAR(700) NULL,
      model VARCHAR(120) NULL,
      createdAt DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NULL,
      PRIMARY KEY (id),
      UNIQUE KEY blog_lead_magnets_pidMagnet_key (pidMagnet),
      UNIQUE KEY blog_lead_magnets_pidBlog_key (pidBlog),
      UNIQUE KEY blog_lead_magnets_slug_key (slug),
      KEY blog_lead_magnets_status_idx (status),
      KEY blog_lead_magnets_pidBlog_status_idx (pidBlog, status),
      KEY blog_lead_magnets_blogSlug_idx (blogSlug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
}

async function loadBlogContext(pidBlog: string) {
  const rows = await prisma.$queryRaw<BlogContextRow[]>(
    Prisma.sql`
      SELECT
        b.pidBlog,
        b.blogTitle,
        b.blogSlug,
        b.blogContent,
        b.blogExt2,
        o.primaryQuery,
        o.recommendedCta
      FROM blog b
      LEFT JOIN seo_opportunities o ON o.blogSlug = b.blogSlug
      WHERE b.pidBlog = ${pidBlog}
      ORDER BY o.confidence DESC, o.impressions DESC, o.createdAt DESC
      LIMIT 1
    `,
  )
  const blog = rows[0]
  if (!blog) throw new Error("Blog post was not found.")
  return blog
}

function buildPrompt(blog: BlogContextRow) {
  const seo = safeJsonParse(blog.blogExt2, {})
  const article = clean(stripHtml(blog.blogContent), 5200)
  return `
You are creating a premium lead magnet for SureImports, a business that helps Nigerians import from China safely.

Create a practical lead magnet for this blog post. The offer must match the article topic and the reader's likely intent.

Rules:
- The lead magnet must be specific enough that a reader would submit first name and email.
- It must teach something immediately useful about importing from China to Nigeria.
- It must not invent customs rates, shipping rates, timelines, guarantees, or live prices.
- Use simple direct language. Avoid hype and vague phrases like "ultimate guide".
- Include exactly one service CTA from this approved service catalog. Do not invent service promises.
  1. /buy-from-chinese-websites
     Use only when the reader already has product links from Chinese websites like 1688, Alibaba, Taobao or Pinduoduo and wants SureImports to help submit, review and buy those linked products through their account.
     Do not describe this service as supplier search, manufacturer research, clearer cost consulting, custom sourcing or strategy.
  2. /ship-with-us
     Use only when the reader already bought goods or has a supplier sending goods to the SureImports China warehouse and needs shipping-only logistics, consolidation updates and delivery support.
  3. /corporate-gifts
     Use for business or bulk sourcing, branded/custom products, supplier search, product comparison, quote review, budget/cost breakdowns, inspection planning, packaging, shipping and delivery support.
  4. https://linescout.sureimports.com/
     Use for machines, production equipment, industrial equipment or technical sourcing guidance where specification review and supplier qualification matter.
  5. /buy-phones-from-china
     Use for phone/device buying.
  6. /laptops-for-business
     Use for bulk laptop needs for teams, schools, companies or resellers.
  7. /shipping-rate or /tools/landed-cost-estimator
     Use only for calculator/tool intent where the next best action is estimating shipping or landed cost, not requesting sourcing support.
- If the blog topic is about landed cost clarity, manufacturer research, supplier comparison, MOQ, custom products, quality checks or sourcing strategy, choose /corporate-gifts unless it is clearly about machines/equipment, then choose https://linescout.sureimports.com/.
- Keep the PDF content compact enough for a short downloadable guide/checklist.

Return only valid JSON with:
{
  "title": "string, max 95 chars",
  "offerHeadline": "string, max 120 chars",
  "description": "string, max 190 chars",
  "buttonText": "string, max 36 chars",
  "bullets": ["short benefit bullets"],
  "emailSubject": "string, max 80 chars",
  "deliveryMessage": "string, max 280 chars",
  "pdf": {
    "title": "string, max 90 chars",
    "subtitle": "string, max 140 chars",
    "audience": "string, max 75 chars",
    "promise": "string, max 120 chars",
    "sections": [{ "heading": "string", "items": ["short practical bullets"] }],
    "actionPlan": ["short next steps"],
    "closingNote": "string, max 130 chars",
    "serviceCta": { "label": "string", "headline": "string", "body": "string that accurately matches the selected service", "url": "approved catalog URL" }
  }
}

Blog title: ${blog.blogTitle}
Blog slug: ${blog.blogSlug || ""}
SEO title: ${seo.seoTitle || seo.metaTitle || ""}
Meta description: ${seo.metaDescription || ""}
Focus keyword: ${seo.focusKeyword || ""}
Search query context: ${blog.primaryQuery || ""}
Recommended CTA: ${blog.recommendedCta || ""}
Article: ${article}
`.trim()
}

async function callOpenAi(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY in admin environment.")

  const model = process.env.LEAD_MAGNET_MODEL || process.env.SEO_AUTOMATION_MODEL || process.env.OPENAI_MODEL || "gpt-5.5"
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: "You create practical JSON lead magnets for SureImports blog readers." },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sureimports_blog_lead_magnet",
          schema: leadMagnetSchema,
          strict: true,
        },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI lead magnet request failed: ${response.status} ${clean(body, 240)}`)
  }

  const payload = await response.json()
  const content =
    typeof payload.output_text === "string"
      ? payload.output_text
      : payload.output
          ?.flatMap((item: any) => item?.content || [])
          ?.map((item: any) => item?.text)
          ?.filter((item: unknown): item is string => typeof item === "string")
          ?.join("")

  if (!content) throw new Error("OpenAI response did not include lead magnet content.")
  return { data: JSON.parse(content), model }
}

async function makeUniqueSlug(baseInput: string, currentPid?: string) {
  const base = slugify(baseInput) || `lead-magnet-${Date.now()}`
  let slug = base
  let index = 2
  while (true) {
    const rows = await prisma.$queryRaw<{ pidMagnet: string }[]>(
      currentPid
        ? Prisma.sql`SELECT pidMagnet FROM blog_lead_magnets WHERE slug = ${slug} AND pidMagnet <> ${currentPid} LIMIT 1`
        : Prisma.sql`SELECT pidMagnet FROM blog_lead_magnets WHERE slug = ${slug} LIMIT 1`,
    )
    if (!rows.length) return slug
    slug = `${base}-${index}`
    index += 1
  }
}

export async function getBlogLeadMagnet(pidBlog: string) {
  await ensureBlogLeadMagnetTable()
  const rows = await prisma.$queryRaw<LeadMagnetRow[]>(
    Prisma.sql`
      SELECT *
      FROM blog_lead_magnets
      WHERE pidBlog = ${pidBlog}
      LIMIT 1
    `,
  )
  return mapLeadMagnet(rows[0])
}

export async function generateBlogLeadMagnet(pidBlog: string) {
  await ensureBlogLeadMagnetTable()
  const blog = await loadBlogContext(pidBlog)
  const existing = await getBlogLeadMagnet(pidBlog)
  const { data, model } = await callOpenAi(buildPrompt(blog))
  const now = new Date()
  const pidMagnet = existing?.pidMagnet || `lead_magnet_${crypto.randomUUID()}`
  const slug = await makeUniqueSlug(data.title || blog.blogTitle, existing?.pidMagnet)
  const bullets = Array.isArray(data.bullets) ? data.bullets.map((item: unknown) => clean(item, 180)).filter(Boolean).slice(0, 5) : []

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO blog_lead_magnets (
        pidMagnet,
        pidBlog,
        blogSlug,
        slug,
        status,
        title,
        offerHeadline,
        description,
        buttonText,
        bulletsJson,
        emailSubject,
        deliveryMessage,
        pdfJson,
        recommendedCta,
        sourceQuery,
        model,
        createdAt,
        updatedAt
      ) VALUES (
        ${pidMagnet},
        ${blog.pidBlog},
        ${blog.blogSlug},
        ${slug},
        'draft',
        ${clean(data.title, 255)},
        ${clean(data.offerHeadline, 255)},
        ${clean(data.description, 2000)},
        ${clean(data.buttonText || "Send me the guide", 120)},
        ${JSON.stringify(bullets)},
        ${clean(data.emailSubject, 255)},
        ${clean(data.deliveryMessage, 2000)},
        ${JSON.stringify(data.pdf || {})},
        ${blog.recommendedCta},
        ${blog.primaryQuery},
        ${model},
        ${now},
        ${now}
      )
      ON DUPLICATE KEY UPDATE
        blogSlug = VALUES(blogSlug),
        slug = VALUES(slug),
        status = 'draft',
        title = VALUES(title),
        offerHeadline = VALUES(offerHeadline),
        description = VALUES(description),
        buttonText = VALUES(buttonText),
        bulletsJson = VALUES(bulletsJson),
        emailSubject = VALUES(emailSubject),
        deliveryMessage = VALUES(deliveryMessage),
        pdfJson = VALUES(pdfJson),
        recommendedCta = VALUES(recommendedCta),
        sourceQuery = VALUES(sourceQuery),
        model = VALUES(model),
        updatedAt = VALUES(updatedAt)
    `,
  )

  return getBlogLeadMagnet(pidBlog)
}
