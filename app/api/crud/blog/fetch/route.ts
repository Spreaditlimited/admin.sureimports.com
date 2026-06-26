import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function publishedNowWhere(now: Date) {
  return {
    blogPublished: true,
    OR: [{ createdAt: null }, { createdAt: { lte: now } }],
  };
}

function scheduledWhere(now: Date) {
  return {
    blogPublished: true,
    createdAt: { gt: now },
  };
}

function draftWhere() {
  return {
    blogPublished: false,
  };
}

function normalizeSearchTerms(search: string) {
  return String(search || '')
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/blog\//, '')
    .replace(/^\/?blog\//, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2);
}

function normalizeSlugSearch(search: string) {
  return String(search || '')
    .toLowerCase()
    .replace(/^https?:\/\/[^/]+\/blog\//, '')
    .replace(/^\/?blog\//, '')
    .replace(/[?#].*$/, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/_+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const now = new Date();
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    const categoryId = searchParams.get('categoryId') || '';

    const slugSearch = normalizeSlugSearch(search);
    const isSlugLikeSearch =
      slugSearch.length >= 12 &&
      slugSearch.includes('-') &&
      !search.trim().includes(' ');
    const searchTerms = normalizeSearchTerms(search);

    if (isSlugLikeSearch) {
      where.OR = [
        { blogSlug: { equals: slugSearch } },
        { blogSlug: { contains: slugSearch } },
        { pidBlog: { contains: slugSearch } },
      ];
    } else if (searchTerms.length) {
      where.AND = searchTerms.map((term) => ({
        OR: [
          { pidBlog: { contains: term } },
          { blogTitle: { contains: term } },
          { blogSlug: { contains: term } },
          { blogContent: { contains: term } },
          { blogBy: { contains: term } },
          { blogExt1: { contains: term } },
          { blogExt2: { contains: term } },
          { category: { is: { categoryName: { contains: term } } } },
          { category: { is: { categorySlug: { contains: term } } } },
          { publisher: { is: { publisherName: { contains: term } } } },
        ],
      }));
    }

    if (status === 'published') {
      Object.assign(where, publishedNowWhere(now));
    } else if (status === 'scheduled') {
      Object.assign(where, scheduledWhere(now));
    } else if (status === 'draft') {
      Object.assign(where, draftWhere());
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Fetch blogs with pagination
    const [blogs, total, totalArticles, publishedArticles, scheduledArticles, draftArticles] = await Promise.all([
      prisma.blog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              pidCategory: true,
              categoryName: true,
              categorySlug: true,
              categoryColor: true,
            },
          },
        },
      }),
      prisma.blog.count({ where }),
      prisma.blog.count(),
      prisma.blog.count({ where: publishedNowWhere(now) }),
      prisma.blog.count({ where: scheduledWhere(now) }),
      prisma.blog.count({ where: draftWhere() }),
    ]);

    return NextResponse.json({
      success: true,
      data: blogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalArticles,
        publishedArticles,
        scheduledArticles,
        draftArticles,
      },
    });
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blogs', error: error.message },
      { status: 500 }
    );
  }
}
