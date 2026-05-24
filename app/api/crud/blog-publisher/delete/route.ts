import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/destroy';

const prisma = new PrismaClient();

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pidPublisher = searchParams.get('pidPublisher');

    if (!pidPublisher) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Publisher ID is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if publisher exists and get associated blogs count
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

    // Check if publisher has blogs
    if (publisher._count.blogs > 0) {
      return NextResponse.json(
        {
          responsex: {
            message: `Cannot delete publisher with ${publisher._count.blogs} associated blog posts. Please reassign or delete the posts first.`,
            status: 'HAS_DEPENDENCIES',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Delete image from Cloudinary if exists
    if (publisher.publisherImage) {
      try {
        await destroyCloudinaryAsset(publisher.publisherImage);
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    // Delete publisher
    await prisma.blog_publisher.delete({
      where: { pidPublisher },
    });

    return NextResponse.json(
      {
        responsex: {
          message: 'Publisher deleted successfully',
          status: 'SUCCESS',
        },
        successx: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting publisher:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to delete publisher',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
