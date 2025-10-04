import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { pidProduct, productVisibility } = body;

    if (!pidProduct) {
      return NextResponse.json(
        {
          statusx: 'ERROR',
          message: 'Product ID is required',
        },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.store.update({
      where: { pidProduct },
      data: {
        productVisibility,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: `Product ${productVisibility ? 'shown' : 'hidden'} successfully`,
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error('Error toggling visibility:', error);
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to update product visibility',
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}