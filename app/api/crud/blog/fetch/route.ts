import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    const categoryId = searchParams.get('categoryId') || '';

    if (search) {
      where.OR = [
        { blogTitle: { contains: search } },
        { blogContent: { contains: search } },
        { blogBy: { contains: search } },
      ];
    }

    if (status) {
      where.blogPublished = status === 'published';
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Fetch blogs with pagination
    const [blogs, total] = await Promise.all([
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
    });
  } catch (error: any) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blogs', error: error.message },
      { status: 500 }
    );
  }
}
