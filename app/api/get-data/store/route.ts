// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt';
import fileFilter from '@/utils/fileFilter';
import randomGenerator from '@/lib/helpers/randomGenerator';
import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/utils/slugGenerator';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Filter parameters
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const visibility = searchParams.get('visibility') || '';
    const condition = searchParams.get('condition') || '';
    const warranty = searchParams.get('warranty') || '';
    const priceMin = searchParams.get('priceMin') || '';
    const priceMax = searchParams.get('priceMax') || '';

    // Build where clause
    const where: any = {};

    // Search filter (product name, brand, or pidProduct)
    if (search) {
      where.OR = [
        { productName: { contains: search } },
        { productBrand: { contains: search } },
        { pidProduct: { contains: search } },
      ];
    }

    // Category filter - exact match, case-insensitive
    if (category) {
      where.productCategory = category;
    }

    // Brand filter - case-insensitive exact match for dropdown
    if (brand) {
      where.productBrand = brand;
    }

    // Visibility filter - convert string to boolean
    if (visibility !== '') {
      where.productVisibility = visibility === 'true';
    }

    // Condition filter - enum value
    if (condition) {
      where.productCondition = condition;
    }

    // Warranty filter - enum value
    if (warranty) {
      where.warrantyPeriod = warranty;
    }

    // Price range filter
    if (priceMin || priceMax) {
      where.productPrice = {};
      if (priceMin) {
        where.productPrice.gte = parseFloat(priceMin);
      }
      if (priceMax) {
        where.productPrice.lte = parseFloat(priceMax);
      }
    }

    console.log('Where clause:', JSON.stringify(where, null, 2)); // Debug log

    // Get total count for pagination
    const totalCount = await prisma.store.count({ where });

    // Fetch paginated products
    const products = await prisma.store.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        pidProduct: true,
        productName: true,
        productPrice: true,
        productBrand: true,
        productCategory: true,
        productVisibility: true,
        productImage: true,
        productCondition: true,
        warrantyPeriod: true,
        createdAt: true,
      },
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`Found ${products.length} products, total: ${totalCount}`); // Debug log

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: products,
      totalCount,
      totalPages,
      currentPage: page,
      perPage: limit,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to fetch products',
        error: error.message,
        data: [],
        totalCount: 0,
        totalPages: 0,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
