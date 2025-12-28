import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pidCategory = searchParams.get('pidCategory');

    if (!pidCategory) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Category ID is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if category exists
    const existingCategory = await prisma.blog_category.findUnique({
      where: { pidCategory },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Category not found',
            status: 'NOT_FOUND',
          },
          successx: false,
        },
        { status: 404 }
      );
    }

    // Check if category has blogs
    if (existingCategory._count.blogs > 0) {
      return NextResponse.json(
        {
          responsex: {
            message: `Cannot delete category. It has ${existingCategory._count.blogs} blog post(s) assigned to it. Please reassign or delete those posts first.`,
            status: 'HAS_DEPENDENCIES',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    await prisma.blog_category.delete({
      where: { pidCategory },
    });

    return NextResponse.json(
      {
        responsex: {
          message: 'Category deleted successfully',
          status: 'SUCCESS',
        },
        successx: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to delete category',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
