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

  //const pidUser = request.nextUrl.searchParams.get('pidUser') as any;
  //const status = request.nextUrl.searchParams.get('status') as any;

  try {
    const adminUsers = await prisma.admin.findMany({
      // where: {
      //   pidUser: pidUser,
      //   status: status,
      // },
      select: {
        id: true,
        pidUser: true,
        userFirstname: true,
        userLastname: true,
        userEmail: true, 
        userPhone: true,
        userStatus: true,
        userExt1: true,
        createdAt: true,
      },
      orderBy: [
        { id: 'asc' },
        //{ createdAt: 'asc' },
      ],
    });

    if (!adminUsers) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(adminUsers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
