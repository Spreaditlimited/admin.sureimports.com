import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { pidCategory, categoryName, categoryDescription, categoryColor, categoryIcon, categoryOrder, status } = body;

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

    // Check for duplicate name (excluding current category)
    if (categoryName) {
      const duplicateCategory = await prisma.blog_category.findFirst({
        where: {
          categoryName: categoryName.trim(),
          NOT: { pidCategory },
        },
      });

      if (duplicateCategory) {
        return NextResponse.json(
          {
            responsex: {
              message: 'A category with this name already exists',
              status: 'DUPLICATE_ERROR',
            },
            successx: false,
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (categoryName) {
      updateData.categoryName = categoryName.trim();
      updateData.categorySlug = generateSlug(categoryName);
    }
    if (categoryDescription !== undefined) updateData.categoryDescription = categoryDescription?.trim() || null;
    if (categoryColor) updateData.categoryColor = categoryColor;
    if (categoryIcon) updateData.categoryIcon = categoryIcon;
    if (categoryOrder !== undefined) updateData.categoryOrder = categoryOrder;
    if (status) updateData.status = status;

    const category = await prisma.blog_category.update({
      where: { pidCategory },
      data: updateData,
    });

    return NextResponse.json(
      {
        responsex: {
          message: 'Category updated successfully',
          status: 'SUCCESS',
        },
        successx: true,
        data: category,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to update category',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
