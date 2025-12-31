import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pidPublisher = searchParams.get('pidPublisher');

    // If pidPublisher is provided, fetch single publisher
    if (pidPublisher) {
      const publisher = await prisma.blog_publisher.findUnique({
        where: { pidPublisher },
        include: {
          _count: {
            select: { blogs: true },
          },
        },
      });

      if (!publisher) {
        return NextResponse.json(
          {
            success: false,
            message: 'Publisher not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: publisher,
      });
    }

    // Fetch all publishers
    const publishers = await prisma.blog_publisher.findMany({
      orderBy: { publisherName: 'asc' },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: publishers,
    });
  } catch (error: any) {
    console.error('Error fetching publishers:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch publishers',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
