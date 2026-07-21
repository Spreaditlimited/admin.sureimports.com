import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createInvoicePdfBuffer, invoicePdfFilename } from '@/lib/invoicing/invoicePdf';
import { loadInvoiceDocument } from '@/lib/invoicing/loadInvoiceDocument';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accessToken: string }> },
) {
  try {
    const { accessToken } = await params;
    const token = await prisma.invoice_access_tokens.findUnique({ where: { accessToken } });
    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invalid or expired invoice link' }, { status: 404 });
    }

    const document = await loadInvoiceDocument(token.pidInvoice);
    if (!document || ['DRAFT', 'CANCELLED'].includes(document.invoice.status)) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice is not available' }, { status: 404 });
    }

    await prisma.invoice_access_tokens.update({
      where: { accessToken },
      data: { lastUsedAt: new Date() },
    });

    const pdf = createInvoicePdfBuffer(document.invoice, document.bankAccounts);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoicePdfFilename(document.invoice.invoiceNumber)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to generate invoice PDF', error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

