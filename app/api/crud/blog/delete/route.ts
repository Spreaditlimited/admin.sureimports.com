import { PrismaClient } from '@prisma/client';
import { getR2Client } from '@/app/utils/r2Client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';

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

    // Delete image from R2 if exists
    if (existingBlog.blogImage) {
      try {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: existingBlog.blogImage,
        });
        await getR2Client().send(deleteCommand);
      } catch (error) {
        console.error('Error deleting image from R2:', error);
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
