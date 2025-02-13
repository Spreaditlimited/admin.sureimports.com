
import { NextRequest, NextResponse } from 'next/server';
import  {prisma} from '@/lib/prisma'; // Assuming you have Prisma setup

export async function GET(request: NextRequest) {

  const status = request.nextUrl.searchParams.get('status');

  const orderALL = await prisma.pay_supplier.findMany({
          where: { status: status }, // Filter by userId   
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            pidPaySupplier: true,
            pidUser: true,
            supplierName: true,
            supplierPhone: true,
            supplierEmail: true,
            aliPayAccountQRCodeImage: true,
            weChatAccountQRCodeImage: true,
            proformaInvoiceImage: true,
            supplierBankAccountDetails: true,
            amountToPayInYuan: true,
            amountToPayInNaira: true,
            serviceCharge: true,
            status: true,
            createdAt: true,
          },
        });

  return NextResponse.json(orderALL);
}