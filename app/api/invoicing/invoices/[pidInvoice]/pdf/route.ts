import { NextRequest, NextResponse } from 'next/server';
import { createInvoicePdfBuffer, invoicePdfFilename } from '@/lib/invoicing/invoicePdf';
import { loadInvoiceDocument } from '@/lib/invoicing/loadInvoiceDocument';
import { canAdminAccessInvoiceCreatedBy, requireAdmin, unauthorized } from '../../../_lib/invoicing';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pidInvoice: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidInvoice } = await params;
    const document = await loadInvoiceDocument(pidInvoice);
    if (!document) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }
    if (!(await canAdminAccessInvoiceCreatedBy(admin, document.invoice.createdByPidUser))) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Forbidden' }, { status: 403 });
    }

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
