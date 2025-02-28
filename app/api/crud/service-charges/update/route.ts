// app/api/upload/route.ts
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
import { getR2Client } from '@/app/utils/r2Client';
import { Upload } from '@aws-sdk/lib-storage';
import getFileExt from '@/app/utils/fileExt'
import fileFilter from '@/app/utils/fileFilter'
import randomGenerator from "@/lib/helpers/randomGenerator";
import { NextResponse } from 'next/server';
import { generateSlug } from '@/app/utils/slugGenerator'

const prisma = new PrismaClient();


export async function PUT(request: Request) {

    const formData = await request.formData();
        const serviceCharge = formData.get('serviceCharge') as string;
        const vat = formData.get('vat') as string;

        //const pidCountry:string = "CTY"+randomGenerator(10);
        //const countrySlug = generateSlug(country);

        try {
            //UPDATE RECORD
            const post = await prisma.exchange_rate.update({  
              where: { id: 1},  
              data: { 
                service_charge: serviceCharge,
                vat: vat,
              },  
            });

            return NextResponse.json(
              { statusx: 'SUCCESS', message: 'Service Charge & VAT has been updated successfully!' },
              { status: 200 },
            );  

        } catch (error) {
            return NextResponse.json(
              { statusx: 'FAILED', message: 'Service Charge & VAT update failed! Try again or contact the admin' },
              { status: 200 },
            );

 

  }
  //END
}