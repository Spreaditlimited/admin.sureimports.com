// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/utils/slugGenerator';


import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const pidUser = request.nextUrl.searchParams.get('pidUser');
  const pidOrder = request.nextUrl.searchParams.get('pidOrder') as any;


// const prisma = new PrismaClient();

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { pidUser: string; pidOrder: string } },
// ) {
//   const { pidUser, pidOrder } = params;

  try {
    const products = await prisma.products.findMany({
      where: {
        pidUser: pidUser,
        pidOrder: pidOrder,
      },
      select: {
        id: true,
        pidUser: true,
        pidProduct: true,
        pidOrder: true,
        productName: true,
        productLink: true,
        productCategory: true,
        productPrice: true,
        productWeight: true,
        productQuantity: true,
        productInfo: true,
        createdAt: true,
      },
      orderBy: [
        { id: 'asc' },
        //{ createdAt: 'asc' },
      ],
    });

    if (!products) {
      return NextResponse.json(
        { error: 'Products not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
