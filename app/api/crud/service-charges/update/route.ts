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
        const foreignVat = formData.get('procurementVatForeign');
        if (typeof foreignVat !== 'string' || !foreignVat.trim() || !Number.isFinite(Number(foreignVat)) || Number(foreignVat) < 0 || Number(foreignVat) > 100) {
          return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'Non-Nigeria VAT must be between 0 and 100 percent.' }, { status: 400 });
        }
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
          vatValue > 100 ||
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
            await prisma.$transaction(async (tx) => {
            await tx.exchange_rate.update({
              where: { id: 1},  
              data: { 
                service_charge: String(serviceCharge),
                vat: String(vat),
                procurementMinimumOrderNgn: minimumOrderValue,
              },  
            });
            await tx.$executeRaw`UPDATE exchange_rate SET procurementVatForeign = ${foreignVat} WHERE id = 1`;
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
