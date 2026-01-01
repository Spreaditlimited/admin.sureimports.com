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
            responsex: {
              message: 'Publisher not found',
              status: 'NOT_FOUND',
            },
            successx: false,
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        responsex: {
          message: 'Publisher fetched successfully',
          status: 'SUCCESS',
        },
        successx: true,
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
      responsex: {
        message: 'Publishers fetched successfully',
        status: 'SUCCESS',
      },
      successx: true,
      data: publishers,
    });
  } catch (error: any) {
    console.error('Error fetching publishers:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to fetch publishers',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
