import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, context: { params: Promise<{ pidQuotation: string }> }) {
  const access = await requireAdminServiceAccess('invoicing', 'view');
  if (!access.ok) return access.response;

  const { pidQuotation } = await context.params;
  const quotation = await prisma.quotation_builder_documents.findUnique({
    where: { pidQuotation },
    include: { invoices: { select: { pidInvoice: true, invoiceNumber: true, status: true } } },
  });
  if (!quotation) {
    return NextResponse.json({ statusx: 'NOT_FOUND', message: 'Quotation not found.' }, { status: 404 });
  }
  const user = quotation.pidUser ? await prisma.users.findUnique({ where: { pidUser: quotation.pidUser } }) : null;
  return NextResponse.json({ statusx: 'SUCCESS', data: { ...quotation, user } });
}
