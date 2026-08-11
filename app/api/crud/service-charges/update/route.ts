import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const prisma = new PrismaClient();


export async function PUT(request: Request) {
    const access = await requireAdminServiceAccess('exchange_rates', 'edit');
    if (!access.ok) return access.response;

    const formData = await request.formData();
        const serviceCharge = formData.get('serviceCharge');
        const vat = formData.get('vat');

        const values = [serviceCharge, vat];
        if (values.some((value) => typeof value !== 'string' || value.trim() === '')) {
          return NextResponse.json(
            { statusx: 'INVALID_INPUT', message: 'Service charge and VAT are required.' },
            { status: 400 },
          );
        }

        const parsedValues = values.map(Number);
        if (parsedValues.some((value) => !Number.isFinite(value) || value < 0)) {
          return NextResponse.json(
            { statusx: 'INVALID_INPUT', message: 'Service charge and VAT must be valid non-negative percentages.' },
            { status: 400 },
          );
        }

        try {
            //UPDATE RECORD
            await prisma.exchange_rate.update({
              where: { id: 1},  
              data: { 
                service_charge: String(serviceCharge),
                vat: String(vat),
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
