import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canAdminAccessInvoiceCreatedBy, createOrGetInvoiceAccessToken, ensureInvoicingCoreTables, requireAdmin, unauthorized, writeAuditLog } from '../../../_lib/invoicing';
import { sendInvoiceIssuedNotification } from '@/lib/notifications/invoicing';
import { getCustomerInvoiceBaseUrl } from '../../../_lib/customerInvoiceBaseUrl';
import { parseInvoiceLinkedRequestId } from '@/lib/invoiceLinkedService';
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

    const existing = await prisma.invoices.findUnique({
      where: { pidInvoice },
      include: { user: true, items: true },
    });

    if (!existing) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }
    if (!(await canAdminAccessInvoiceCreatedBy(admin, existing.createdByPidUser))) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Forbidden' }, { status: 403 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ statusx: 'ERROR', message: 'Only DRAFT invoices can be issued' }, { status: 400 });
    }

    if (!existing.items.length) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice has no line items' }, { status: 400 });
    }

    const linkedService = parseInvoiceLinkedRequestId(existing.linkedRequestId);
    if (linkedService.type === 'corporate-gift') {
      if (!existing.pidQuotation) {
        return NextResponse.json({ statusx: 'ERROR', message: 'Create and send a linked quotation before issuing this corporate sourcing invoice.' }, { status: 400 });
      }
      const quotation = await prisma.quotation_builder_documents.findUnique({
        where: { pidQuotation: existing.pidQuotation },
        select: { linkedRequestId: true, lastSentAt: true },
      });
      if (!quotation?.lastSentAt || quotation.linkedRequestId !== linkedService.id) {
        return NextResponse.json({ statusx: 'ERROR', message: 'The linked corporate sourcing quotation must be sent before this invoice can be issued.' }, { status: 400 });
      }
    }

    const settings = await prisma.invoice_settings.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    const updated = await prisma.invoices.update({
      where: { pidInvoice },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        updatedByPidUser: admin.pidUser,
        headerSnapshot:
          existing.headerSnapshot ||
          (settings ? `${settings.businessName}\n${settings.businessContactDetails}` : null),
        footerSnapshot: existing.footerSnapshot || settings?.footerNotes || null,
      },
    });

    if (linkedService.type === 'corporate-gift') {
      await prisma.corporate_gift_request.updateMany({
        where: { pidRequest: linkedService.id },
        data: { status: 'Invoiced' },
      });
    }
    if (linkedService.type === 'shipping-only') {
      await prisma.shipping_only.updateMany({
        where: { pidShippingOnly: linkedService.id },
        data: { status: 'invoiced', updatedAt: new Date() },
      });
    }

    await writeAuditLog({
      pidInvoice,
      pidUser: admin.pidUser,
      action: 'INVOICE_ISSUED',
      oldStatus: existing.status,
      newStatus: 'ISSUED',
      metadata: JSON.stringify({
        linkedRequestId: updated.linkedRequestId || null,
        linkedRequestStatusSetTo:
          linkedService.type === 'corporate-gift'
            ? 'Invoiced'
            : linkedService.type === 'shipping-only'
              ? 'invoiced'
              : null,
      }),
    });

    if (existing.customerEmail) {
      const token = await createOrGetInvoiceAccessToken({
        pidInvoice,
        createdByPidUser: admin.pidUser,
      });
      const customerBaseUrl = getCustomerInvoiceBaseUrl();
      const customerInvoiceLink = `${customerBaseUrl}/invoice/${token.accessToken}`;
      const document = await loadInvoiceDocument(pidInvoice);
      const pdfAttachment = document
        ? {
            filename: invoicePdfFilename(existing.invoiceNumber),
            content: createInvoicePdfBuffer(document.invoice, document.bankAccounts),
          }
        : undefined;
      await sendInvoiceIssuedNotification({
        toEmail: existing.customerEmail,
        customerName: document?.invoice.customerContactName || existing.user.userFirstname || existing.customerName || 'Customer',
        invoiceNumber: existing.invoiceNumber,
        currency: existing.currency,
        grandTotal: Number(existing.grandTotal || 0),
        balanceDue: Number(existing.balanceDue || 0),
        issuedAt: updated.issuedAt,
        dueAt: existing.dueAt,
        headerSnapshot: updated.headerSnapshot,
        footerSnapshot: updated.footerSnapshot,
        invoiceLink: customerInvoiceLink,
        pdfAttachment,
      }).catch(() => null);
    }

    return NextResponse.json({ statusx: 'SUCCESS', data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to issue invoice', error: error.message },
      { status: 500 },
    );
  }
}
