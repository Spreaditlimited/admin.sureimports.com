import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrGetInvoiceAccessToken, ensureInvoicingCoreTables, requireAdmin, unauthorized, writeAuditLog } from '../../../_lib/invoicing';
import { sendInvoiceIssuedNotification } from '@/lib/notifications/invoicing';
import { getCustomerInvoiceBaseUrl } from '../../../_lib/customerInvoiceBaseUrl';

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

    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ statusx: 'ERROR', message: 'Only DRAFT invoices can be issued' }, { status: 400 });
    }

    if (!existing.items.length) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice has no line items' }, { status: 400 });
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

    if (updated.linkedRequestId) {
      await prisma.corporate_gift_request.updateMany({
        where: { pidRequest: updated.linkedRequestId },
        data: { status: 'Invoiced' },
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
        linkedRequestStatusSetTo: updated.linkedRequestId ? 'Invoiced' : null,
      }),
    });

    if (existing.customerEmail) {
      const token = await createOrGetInvoiceAccessToken({
        pidInvoice,
        createdByPidUser: admin.pidUser,
      });
      const customerBaseUrl = getCustomerInvoiceBaseUrl();
      const customerInvoiceLink = `${customerBaseUrl}/invoice/${token.accessToken}`;
      await sendInvoiceIssuedNotification({
        toEmail: existing.customerEmail,
        customerName: existing.customerName || existing.user.userFirstname || 'Customer',
        invoiceNumber: existing.invoiceNumber,
        currency: existing.currency,
        grandTotal: Number(existing.grandTotal || 0),
        balanceDue: Number(existing.balanceDue || 0),
        issuedAt: updated.issuedAt,
        dueAt: existing.dueAt,
        headerSnapshot: updated.headerSnapshot,
        footerSnapshot: updated.footerSnapshot,
        invoiceLink: customerInvoiceLink,
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
