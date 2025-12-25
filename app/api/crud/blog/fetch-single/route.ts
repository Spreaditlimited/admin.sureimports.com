import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pidBlog = searchParams.get('pidBlog');
    const slug = searchParams.get('slug');

    if (!pidBlog && !slug) {
      return NextResponse.json(
        { success: false, message: 'Blog ID or slug is required' },
        { status: 400 }
      );
    }

    const where: any = {};
    if (pidBlog) where.pidBlog = pidBlog;
    if (slug) where.blogSlug = slug;

    const blog = await prisma.blog.findFirst({ where });

    if (!blog) {
      return NextResponse.json(
        { success: false, message: 'Blog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: blog,
    });
  } catch (error: any) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch blog', error: error.message },
      { status: 500 }
    );
  }
}
