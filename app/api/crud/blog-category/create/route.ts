import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { categoryName, categoryDescription, categoryColor, categoryIcon, categoryOrder } = body;

    if (!categoryName || !categoryName.trim()) {
      return NextResponse.json(
        {
          responsex: {
            message: 'Category name is required',
            status: 'VALIDATION_ERROR',
          },
          successx: false,
        },
        { status: 400 }
      );
    }

    // Check if category with same name exists
    const existingCategory = await prisma.blog_category.findFirst({
      where: {
        categoryName: categoryName.trim(),
      },
    });

    if (existingCategory) {
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

    const pidCategory = 'CAT' + new Date().getTime().toString();
    const categorySlug = generateSlug(categoryName);

    const category = await prisma.blog_category.create({
      data: {
        pidCategory,
        categoryName: categoryName.trim(),
        categorySlug,
        categoryDescription: categoryDescription?.trim() || null,
        categoryColor: categoryColor || '#6366f1',
        categoryIcon: categoryIcon || 'folder',
        categoryOrder: categoryOrder || 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        responsex: {
          message: 'Category created successfully',
          status: 'SUCCESS',
        },
        successx: true,
        data: category,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      {
        responsex: {
          message: 'Failed to create category',
          status: 'ACTION_FAILED',
        },
        successx: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
