import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const categories = await prisma.blog_category.findMany({
      where: {
        status: 'active',
      },
      orderBy: [
        { categoryOrder: 'asc' },
        { categoryName: 'asc' },
      ],
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch categories',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
