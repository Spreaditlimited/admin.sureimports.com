import type { PrismaClient } from "@prisma/client";

const INTERNAL_BLOG_LINK =
  /<a\b[^>]*\bhref\s*=\s*(["'])(?:https?:\/\/(?:www\.)?sureimports\.com)?\/blog\/([^"'?#/]+)(?:[?#][^"']*)?\1[^>]*>/gi;

const PARAGRAPH = /<p\b[^>]*>[\s\S]*?<\/p>/gi;

const CORPORATE_AUDIENCE =
  /\b(established organisations?|banks?|large companies|government bodies|formal procurement|corporate sourcing)\b/i;

const LINESCOUT_ANCHOR =
  /<a\b[^>]*\bhref\s*=\s*(["'])https:\/\/linescout\.sureimports\.com\/[^"']*\1[^>]*>[\s\S]*?<\/a>/gi;

export function extractInternalBlogSlugs(html: string) {
  const slugs = new Set<string>();
  for (const match of String(html || "").matchAll(INTERNAL_BLOG_LINK)) {
    let slug = String(match[2] || "")
      .trim()
      .toLowerCase();
    try {
      slug = decodeURIComponent(slug);
    } catch {
      // Keep the encoded value so validation rejects it as an unavailable slug.
    }
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

export function findAudienceRoutingIssues(html: string) {
  const issues: string[] = [];
  for (const paragraph of String(html || "").match(PARAGRAPH) || []) {
    for (const match of paragraph.matchAll(LINESCOUT_ANCHOR)) {
      const precedingText =
        paragraph
          .slice(0, match.index)
          .replace(/<[^>]*>/g, " ")
          .split(/[.!?]/)
          .at(-1) || "";
      const anchorText = match[0].replace(/<[^>]*>/g, " ");
      if (CORPORATE_AUDIENCE.test(`${precedingText} ${anchorText}`)) {
        issues.push(
          "A corporate-audience call to action points to LineScout. Established organisations must use Sure Imports Corporate Sourcing.",
        );
      }
    }
  }
  return issues;
}

export async function findBlogPublicationIssues(input: {
  prisma: PrismaClient;
  html: string;
  publishAt: Date;
  currentSlug?: string | null;
  publication?: {
    title: string;
    image: string | null;
    publisherId: string | null;
    categoryId: string | null;
    seoJson: string;
    newPublication: boolean;
  };
}) {
  const issues = findAudienceRoutingIssues(input.html);
  if (input.publication) {
    const record = input.publication;
    const [peers, publisher, category] = await Promise.all([
      input.prisma.blog.findMany({
        where: { xStaus: "active", blogSlug: { not: input.currentSlug || "" } },
        select: { blogSlug: true, blogContent: true },
      }),
      input.prisma.blog_publisher.findFirst({
        where: { pidPublisher: record.publisherId || "", status: "active" },
      }),
      input.prisma.blog_category.findFirst({
        where: { pidCategory: record.categoryId || "", status: "active" },
      }),
    ]);
    issues.push(
      ...findArticleQualityIssues({
        html: input.html,
        image: record.image,
        newPublication: record.newPublication,
        peers: peers.map((peer) => ({
          slug: peer.blogSlug || "",
          html: peer.blogContent || "",
        })),
      }),
    );
    if (
      publisher?.pidPublisher !== "PUB1767167254459" ||
      publisher.publisherName !== "Tochukwu Nkwocha" ||
      !publisher.publisherImage
    )
      issues.push(
        "Use the active Tochukwu Nkwocha author profile and its existing image.",
      );
    if (!category) issues.push("Select an active existing blog category.");
    try {
      const seo = JSON.parse(record.seoJson || "{}");
      if (
        seo.canonicalUrl &&
        seo.canonicalUrl !==
          `https://www.sureimports.com/blog/${input.currentSlug}`
      )
        issues.push("Canonical must match the existing public article URL.");
      if (record.newPublication) {
        const title = String(seo.seoTitle || seo.metaTitle || record.title);
        const description = String(seo.metaDescription || "");
        if (!title.trim() || title.length >= 65)
          issues.push("Set an accurate SEO title under 65 characters.");
        if (description.length < 120 || description.length > 160)
          issues.push(
            "Set a useful meta description between 120 and 160 characters.",
          );
      }
    } catch {
      issues.push("SEO metadata must be valid JSON.");
    }
    const destinations = new Set<string>();
    for (const match of input.html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)) {
      try {
        const url = new URL(
          match[2].replace(/&amp;/g, "&"),
          "https://www.sureimports.com",
        );
        if (
          ["www.sureimports.com", "sureimports.com"].includes(url.hostname) &&
          !url.pathname.startsWith("/blog/") &&
          !url.pathname.startsWith("/dashboard") &&
          !url.pathname.startsWith("/auth")
        )
          destinations.add(`https://www.sureimports.com${url.pathname}`);
      } catch {
        issues.push(`Invalid link: ${match[2]}`);
      }
    }
    const urls = [...destinations];
    for (let offset = 0; offset < urls.length; offset += 5) {
      const checks = await Promise.all(
        urls.slice(offset, offset + 5).map(async (url) => {
          try {
            const response = await fetch(url, {
              method: "HEAD",
              signal: AbortSignal.timeout(8000),
            });
            return response.ok
              ? null
              : `Internal destination is not available (${response.status}): ${url}`;
          } catch {
            return `Could not verify internal destination: ${url}`;
          }
        }),
      );
      issues.push(...checks.filter((issue): issue is string => Boolean(issue)));
    }
  }
  const linkedSlugs = extractInternalBlogSlugs(input.html).filter(
    (slug) => slug !== String(input.currentSlug || "").toLowerCase(),
  );

  if (!linkedSlugs.length) return issues;

  const available = await input.prisma.blog.findMany({
    where: {
      blogSlug: { in: linkedSlugs },
      blogPublished: true,
      xStaus: "active",
      OR: [{ createdAt: null }, { createdAt: { lte: input.publishAt } }],
    },
    select: { blogSlug: true },
  });
  const availableSlugs = new Set(
    available.map((post) => String(post.blogSlug || "").toLowerCase()),
  );

  for (const slug of linkedSlugs) {
    if (!availableSlugs.has(slug)) {
      issues.push(
        `Internal blog link is not public by the article publication time: /blog/${slug}`,
      );
    }
  }

  return issues;
}

/** Editorial checks for stored article bodies; site chrome is deliberately excluded. */
export function articleText(html: string) {
  return String(html || "")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (text: string) => (text ? text.split(/\s+/).length : 0);
function paragraphs(html: string) {
  return (String(html || "").match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
    .map(articleText)
    .filter((text) => words(text) >= 20);
}

export function articleRepetition(
  html: string,
  peers: Array<{ slug: string; html: string }>,
) {
  const bodyWords = words(articleText(html));
  const own = paragraphs(html);
  const counts = new Map<string, number>();
  let largestOverlap = { slug: "", words: 0 };
  for (const peer of peers) {
    const set = new Set(paragraphs(peer.html));
    for (const text of set) counts.set(text, (counts.get(text) || 0) + 1);
    const overlap = own.reduce(
      (sum, text) => sum + (set.has(text) ? words(text) : 0),
      0,
    );
    if (overlap > largestOverlap.words)
      largestOverlap = { slug: peer.slug, words: overlap };
  }
  const sharedWords = own.reduce(
    (sum, text) => sum + ((counts.get(text) || 0) >= 3 ? words(text) : 0),
    0,
  );
  return {
    bodyWords,
    sharedWords,
    sharedRatio: bodyWords ? sharedWords / bodyWords : 0,
    largestOverlap,
    pairRatio: bodyWords ? largestOverlap.words / bodyWords : 0,
  };
}

export function findArticleQualityIssues(input: {
  html: string;
  newPublication: boolean;
  image?: string | null;
  peers: Array<{ slug: string; html: string }>;
}) {
  const issues: string[] = [];
  const repetition = articleRepetition(input.html, input.peers);
  if (input.newPublication && repetition.bodyWords < 2000) {
    issues.push(
      `New articles require at least 2,000 useful body words under the site's editorial policy; this draft has ${repetition.bodyWords}. Length alone does not establish quality.`,
    );
  }
  if (!input.image?.trim())
    issues.push(
      "An article-specific feature image is required before publication.",
    );
  if (
    /\b(?:content cluster|Sure Imports cluster|product-selection cluster|SEO cluster)\b/i.test(
      articleText(input.html),
    )
  ) {
    issues.push(
      "Remove publishing-process language about content clusters from the reader-facing article.",
    );
  }
  if (/<h1\b/i.test(input.html))
    issues.push(
      "Use H2/H3 headings in the body; the page already supplies the article H1.",
    );
  if (repetition.sharedWords >= 200 && repetition.sharedRatio >= 0.25) {
    issues.push(
      `${Math.round(repetition.sharedRatio * 100)}% of body words repeat long paragraphs found in at least three other articles. Replace reused passages with subject-specific information.`,
    );
  } else if (
    repetition.largestOverlap.words >= 200 &&
    repetition.pairRatio >= 0.35
  ) {
    issues.push(
      `${Math.round(repetition.pairRatio * 100)}% of body words repeat paragraphs from /blog/${repetition.largestOverlap.slug}. Review whether the pages serve distinct reader needs.`,
    );
  }
  for (const match of input.html.matchAll(/\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    const href = match[2];
    if (
      /(?:^|\/)(?:undefined|null)(?:[/?#]|$)/i.test(href) ||
      href.includes("/tools/carton-optimization-tool")
    ) {
      issues.push(`Invalid internal destination: ${href}`);
    }
  }
  return [...new Set(issues)];
}

export async function verifyBlogFeatureImage(url: string | null) {
  if (!url)
    throw new Error("The blog feature image has no public delivery URL.");
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !["res.cloudinary.com", "www.sureimports.com"].includes(parsed.hostname)
  )
    throw new Error("Use the established Cloudinary blog-image workflow.");
  const response = await fetch(url, {
    method: "HEAD",
    signal: AbortSignal.timeout(10000),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw new Error("The blog feature image is not publicly available.");
}
