import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAdminAccessInvoiceCreatedBy, createOrGetInvoiceAccessToken, ensureInvoicingCoreTables, requireAdmin, unauthorized, writeAuditLog } from '../../../_lib/invoicing';
import { sendInvoiceIssuedNotification } from '@/lib/notifications/invoicing';
import { getCustomerInvoiceBaseUrl } from '../../../_lib/customerInvoiceBaseUrl';
import { createInvoicePdfBuffer, invoicePdfFilename } from '@/lib/invoicing/invoicePdf';
import { loadInvoiceDocument } from '@/lib/invoicing/loadInvoiceDocument';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ pidInvoice: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();
    await ensureInvoicingCoreTables();

    const { pidInvoice } = await params;

    const invoice = await prisma.invoices.findUnique({
      where: { pidInvoice },
      include: { user: true },
    });

    if (!invoice) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }
    if (!(await canAdminAccessInvoiceCreatedBy(admin, invoice.createdByPidUser))) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Forbidden' }, { status: 403 });
    }

    if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { statusx: 'ERROR', message: `Cannot send invoice in ${invoice.status} status` },
        { status: 400 },
      );
    }

    if (!invoice.customerEmail) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Customer email not found on invoice' }, { status: 400 });
    }

    const token = await createOrGetInvoiceAccessToken({
      pidInvoice,
      createdByPidUser: admin.pidUser,
    });
    const customerBaseUrl = getCustomerInvoiceBaseUrl();
    const customerInvoiceLink = `${customerBaseUrl}/invoice/${token.accessToken}`;
    const document = await loadInvoiceDocument(pidInvoice);
    if (!document) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice document could not be prepared' }, { status: 500 });
    }
    const pdfAttachment = {
      filename: invoicePdfFilename(invoice.invoiceNumber),
      content: createInvoicePdfBuffer(document.invoice, document.bankAccounts),
    };

    await sendInvoiceIssuedNotification({
      toEmail: invoice.customerEmail,
      customerName: document.invoice.customerContactName || document.invoice.customerName || 'Customer',
      invoiceNumber: invoice.invoiceNumber,
      currency: invoice.currency,
      grandTotal: Number(invoice.grandTotal || 0),
      balanceDue: Number(invoice.balanceDue || 0),
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      headerSnapshot: invoice.headerSnapshot,
      footerSnapshot: invoice.footerSnapshot,
      invoiceLink: customerInvoiceLink,
      pdfAttachment,
    });

    await writeAuditLog({
      pidInvoice,
      pidUser: admin.pidUser,
      action: 'INVOICE_SENT',
      metadata: JSON.stringify({ invoiceNumber: invoice.invoiceNumber, pdfAttached: true }),
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        pidInvoice,
        invoiceNumber: invoice.invoiceNumber,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to send invoice', error: error.message },
      { status: 500 },
    );
  }
}
