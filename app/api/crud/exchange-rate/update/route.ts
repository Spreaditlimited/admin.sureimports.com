import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const prisma = new PrismaClient();


export async function PUT(request: Request) {
    const access = await requireAdminServiceAccess('exchange_rates', 'edit');
    if (!access.ok) return access.response;

    const formData = await request.formData();
        const nairaToDollar = formData.get('nairaToDollar');
        const yuanToDollar = formData.get('yuanToDollar');
        const nairaToYuan = formData.get('nairaToYuan');
        const quotationSeaRateNgnPerCbm = formData.get('quotationSeaRateNgnPerCbm');
        const values = [nairaToDollar, yuanToDollar, nairaToYuan, quotationSeaRateNgnPerCbm];

        if (values.some((value) => typeof value !== 'string' || value.trim() === '')) {
          return NextResponse.json(
            { statusx: 'INVALID_INPUT', message: 'All exchange and quotation-rate fields are required.' },
            { status: 400 },
          );
        }

        const parsedValues = values.map(Number);
        if (parsedValues.some((value) => !Number.isFinite(value) || value <= 0)) {
          return NextResponse.json(
            { statusx: 'INVALID_INPUT', message: 'Exchange and quotation rates must be valid amounts greater than zero.' },
            { status: 400 },
          );
        }

        try {
            //UPDATE RECORD
            await prisma.exchange_rate.update({
              where: { id: 1},  
              data: { 
                exNairaToDollar: String(nairaToDollar),
                exYuanToDollar: String(yuanToDollar),
                exNairaToYuan: String(nairaToYuan),
                quotationSeaRateNgnPerCbm: String(quotationSeaRateNgnPerCbm),
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
