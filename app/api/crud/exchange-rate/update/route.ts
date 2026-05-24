// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import getFileExt from '@/app/utils/fileExt'
import fileFilter from '@/app/utils/fileFilter'
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator'

const prisma = new PrismaClient();


export async function PUT(request: Request) {

    const formData = await request.formData();
        const nairaToDollar = formData.get('nairaToDollar') as string;
        const yuanToDollar = formData.get('yuanToDollar') as string;
        const nairaToYuan = formData.get('nairaToYuan') as string;

        //const pidCountry:string = "CTY"+randomGenerator(10);
        //const countrySlug = generateSlug(country);

        try {
            //UPDATE RECORD
            const post = await prisma.exchange_rate.update({  
              where: { id: 1},  
              data: { 
                exNairaToDollar: nairaToDollar,
                exYuanToDollar: yuanToDollar,
                exNairaToYuan: nairaToYuan,
              },  
            });

            return NextResponse.json(
              { statusx: 'SUCCESS', message: 'Exchange Rate has been updated successfully!' },
              { status: 200 },
            );  

        } catch (error) {
            return NextResponse.json(
              { statusx: 'FAILED', message: 'Exchange Rate update failed! Try again or contact tye ad' },
              { status: 200 },
            );

 

  }
  //END
}
