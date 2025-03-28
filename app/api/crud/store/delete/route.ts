// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import { getR2Client } from '@/app/utils/r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt'
import fileFilter from '@/app/utils/fileFilter'
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextRequest, NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator'
import bcrypt from "bcryptjs"

const prisma = new PrismaClient();


//export async function POST(request: Request) {
  export async function GET(request: NextRequest) {

const pidProduct = request.nextUrl.searchParams.get('pidProduct') as any;

        try {
            await prisma.store.delete({
              where: { pidProduct: pidProduct },
        });

      return NextResponse.json(
      { statusx: 'SUCCESS', message: 'Product was successfully deleted!' },
      { status: 200 },
    );

    } catch (error) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Failed to delete product, please contact super admin' },
        { status: 401 },
      );
    }finally {
        await prisma.$disconnect();
    }

  //END
}