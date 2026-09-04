import type { PrismaClient } from '@prisma/client';

const INTERNAL_BLOG_LINK =
  /<a\b[^>]*\bhref\s*=\s*(["'])(?:https?:\/\/(?:www\.)?sureimports\.com)?\/blog\/([^"'?#/]+)(?:[?#][^"']*)?\1[^>]*>/gi;

const PARAGRAPH = /<p\b[^>]*>[\s\S]*?<\/p>/gi;

const CORPORATE_AUDIENCE =
  /\b(established organisations?|banks?|large companies|government bodies|formal procurement|corporate sourcing)\b/i;

const LINESCOUT_ANCHOR =
  /<a\b[^>]*\bhref\s*=\s*(["'])https:\/\/linescout\.sureimports\.com\/[^"']*\1[^>]*>[\s\S]*?<\/a>/gi;

export function extractInternalBlogSlugs(html: string) {
  const slugs = new Set<string>();
  for (const match of String(html || '').matchAll(INTERNAL_BLOG_LINK)) {
    let slug = String(match[2] || '').trim().toLowerCase();
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
  for (const paragraph of String(html || '').match(PARAGRAPH) || []) {
    for (const match of paragraph.matchAll(LINESCOUT_ANCHOR)) {
      const precedingText = paragraph
        .slice(0, match.index)
        .replace(/<[^>]*>/g, ' ')
        .split(/[.!?]/)
        .at(-1) || '';
      const anchorText = match[0].replace(/<[^>]*>/g, ' ');
      if (CORPORATE_AUDIENCE.test(`${precedingText} ${anchorText}`)) {
        issues.push(
          'A corporate-audience call to action points to LineScout. Established organisations must use Sure Imports Corporate Sourcing.',
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
}) {
  const issues = findAudienceRoutingIssues(input.html);
  const linkedSlugs = extractInternalBlogSlugs(input.html).filter(
    (slug) => slug !== String(input.currentSlug || '').toLowerCase(),
  );

  if (!linkedSlugs.length) return issues;

  const available = await input.prisma.blog.findMany({
    where: {
      blogSlug: { in: linkedSlugs },
      blogPublished: true,
      OR: [{ createdAt: null }, { createdAt: { lte: input.publishAt } }],
    },
    select: { blogSlug: true },
  });
  const availableSlugs = new Set(
    available.map((post) => String(post.blogSlug || '').toLowerCase()),
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
