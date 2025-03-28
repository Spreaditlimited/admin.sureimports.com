// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import { getR2Client } from '@/app/utils/r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/utils/slugGenerator';


import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  //const pidUser = request.nextUrl.searchParams.get('pidUser') as any;
  //const status = request.nextUrl.searchParams.get('status') as any;

  try {
    const products = await prisma.store.findMany({
      // where: {
      //   pidUser: pidUser,
      //   status: status,
      // },
      select: {
        id: true,
        pidProduct: true,
        productName: true, 
        productBrand: true,
        productCategory: true,
        productVisibility: true,
        productImage: true,
        createdAt: true,
      },
      orderBy: [
        { id: 'asc' },
        //{ createdAt: 'asc' },
      ],
    });

    if (!products) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
