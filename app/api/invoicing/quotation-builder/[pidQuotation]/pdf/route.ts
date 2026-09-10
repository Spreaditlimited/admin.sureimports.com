import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { downloadCloudinaryPdf } from '@/lib/cloudinary/download';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request, context: { params: Promise<{ pidQuotation: string }> }) {
  const access = await requireAdminServiceAccess('invoicing', 'view');
  if (!access.ok) return access.response;
  const { pidQuotation } = await context.params;
  const record = await prisma.quotation_builder_documents.findUnique({ where: { pidQuotation } });
  if (!record?.pdfPublicId) return NextResponse.json({ statusx: 'NOT_FOUND', message: 'Quotation PDF is unavailable.' }, { status: 404 });
  try {
    const pdf = await downloadCloudinaryPdf(record.pdfPublicId);
    const shouldDownload = new URL(request.url).searchParams.get('download') === '1';
    const safeQuotationNumber = record.quotationNumber.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${shouldDownload ? 'attachment' : 'inline'}; filename="Sure-Imports-${safeQuotationNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return NextResponse.json({ statusx: 'ERROR', message: error instanceof Error ? error.message : 'Unable to retrieve quotation.' }, { status: 502 });
  }
}
