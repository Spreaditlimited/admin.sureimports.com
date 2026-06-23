import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { destroyCloudinaryAsset } from '@/lib/cloudinary/destroy';
import { normalizeBlogImagePublicId } from '@/lib/blogImage';

const prisma = new PrismaClient();

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pidBlog = searchParams.get('pidBlog');

    if (!pidBlog) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Blog ID is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if blog exists
    const existingBlog = await prisma.blog.findUnique({
      where: { pidBlog },
    });

    if (!existingBlog) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Blog not found',
            status: 'NOT_FOUND',
          },
          successx: false,
        },
        { status: 404 }
      );
    }

    // Delete image from Cloudinary if exists
    if (existingBlog.blogImage) {
      try {
        await destroyCloudinaryAsset(normalizeBlogImagePublicId(existingBlog.blogImage));
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
      }
    }

    // Delete blog from database
    await prisma.blog.delete({
      where: { pidBlog },
    });

    return NextResponse.json(
      {
        responsex: {
          message: 'Blog post was successfully deleted',
          status: 'SUCCESS',
        },
        successx: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting blog:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to delete blog post',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
