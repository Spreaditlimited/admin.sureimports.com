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
        const procurementMinimumOrderNgn = formData.get(
          'procurementMinimumOrderNgn',
        );

        const values = [serviceCharge, vat, procurementMinimumOrderNgn];
        if (values.some((value) => typeof value !== 'string' || value.trim() === '')) {
          return NextResponse.json(
            { statusx: 'INVALID_INPUT', message: 'All settings are required.' },
            { status: 400 },
          );
        }

        const parsedValues = values.map(Number);
        const [serviceChargeValue, vatValue, minimumOrderValue] = parsedValues;
        if (
          !Number.isFinite(serviceChargeValue) ||
          serviceChargeValue < 0 ||
          !Number.isFinite(vatValue) ||
          vatValue < 0 ||
          !Number.isInteger(minimumOrderValue) ||
          minimumOrderValue < 0 ||
          minimumOrderValue > 100000000
        ) {
          return NextResponse.json(
            {
              statusx: 'INVALID_INPUT',
              message:
                'Enter valid non-negative percentages and a whole-number procurement minimum.',
            },
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
                procurementMinimumOrderNgn: minimumOrderValue,
              },  
            });

            return NextResponse.json(
              { statusx: 'SUCCESS', message: 'Financial settings updated successfully.' },
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
