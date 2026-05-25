import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canTransitionStatus,
  requireAdmin,
  syncOverdueInvoices,
  toMoneyInput,
  unauthorized,
  writeAuditLog,
} from '../../_lib/invoicing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pidInvoice: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidInvoice } = await params;
    await syncOverdueInvoices(pidInvoice);

    const invoice = await prisma.invoices.findUnique({
      where: { pidInvoice },
      include: {
        items: true,
        payments: {
          orderBy: { paidAt: 'desc' },
        },
        receipts: {
          orderBy: { issuedAt: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        user: {
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ statusx: 'SUCCESS', data: invoice });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch invoice', error: error.message },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pidInvoice: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidInvoice } = await params;
    const body = await request.json();

    const existing = await prisma.invoices.findUnique({ where: { pidInvoice }, include: { items: true } });
    if (!existing) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }

    const data: any = {
      updatedByPidUser: admin.pidUser,
    };

    if (body.headerSnapshot !== undefined) data.headerSnapshot = body.headerSnapshot || null;
    if (body.footerSnapshot !== undefined) data.footerSnapshot = body.footerSnapshot || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.dueAt !== undefined) data.dueAt = body.dueAt ? new Date(body.dueAt) : null;

    if (body.status !== undefined) {
      if (!canTransitionStatus(existing.status, body.status)) {
        return NextResponse.json(
          { statusx: 'ERROR', message: `Invalid status transition from ${existing.status} to ${body.status}` },
          { status: 400 },
        );
      }
      data.status = body.status;
      if (body.status === 'PAID') data.paidAt = new Date();
    }

    if (Array.isArray(body.items)) {
      if (existing.status !== 'DRAFT') {
        return NextResponse.json(
          { statusx: 'ERROR', message: 'Line items can only be edited while invoice is DRAFT' },
          { status: 400 },
        );
      }

      if (body.items.length === 0) {
        return NextResponse.json({ statusx: 'ERROR', message: 'At least one line item is required' }, { status: 400 });
      }

      let subtotalNum = 0;
      const newItems = body.items.map((item: any, index: number) => {
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        if (!item.description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid item at row ${index + 1}`);
        }
        const lineTotal = quantity * unitPrice;
        subtotalNum += lineTotal;
        return {
          pidInvoiceItem: `IVI-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          lineNo: index + 1,
          description: String(item.description),
          quantity: quantity.toFixed(2),
          unitPrice: unitPrice.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        };
      });

      const discount = Number(body.discountTotal ?? existing.discountTotal ?? 0) || 0;
      const tax = Number(body.taxTotal ?? existing.taxTotal ?? 0) || 0;
      const grandTotalNum = subtotalNum - discount + tax;
      if (grandTotalNum < 0) {
        return NextResponse.json({ statusx: 'ERROR', message: 'Grand total cannot be negative' }, { status: 400 });
      }

      data.subtotal = toMoneyInput(subtotalNum);
      data.discountTotal = toMoneyInput(discount);
      data.taxTotal = toMoneyInput(tax);
      data.grandTotal = toMoneyInput(grandTotalNum);

      const currentAmountPaid = Number(existing.amountPaid || 0);
      data.balanceDue = toMoneyInput(Math.max(grandTotalNum - currentAmountPaid, 0));

      await prisma.$transaction([
        prisma.invoice_items.deleteMany({ where: { pidInvoice } }),
        prisma.invoices.update({ where: { pidInvoice }, data }),
        prisma.invoice_items.createMany({ data: newItems.map((item: any) => ({ ...item, pidInvoice })) }),
      ]);

      await writeAuditLog({
        pidInvoice,
        pidUser: admin.pidUser,
        action: 'INVOICE_UPDATED_ITEMS',
        oldStatus: existing.status,
        newStatus: body.status || existing.status,
      });

      const updated = await prisma.invoices.findUnique({ where: { pidInvoice }, include: { items: true } });
      return NextResponse.json({ statusx: 'SUCCESS', data: updated });
    }

    const updated = await prisma.invoices.update({ where: { pidInvoice }, data });

    await writeAuditLog({
      pidInvoice,
      pidUser: admin.pidUser,
      action: 'INVOICE_UPDATED',
      oldStatus: existing.status,
      newStatus: updated.status,
      metadata: JSON.stringify({ changedFields: Object.keys(data) }),
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to update invoice', error: error.message },
      { status: 500 },
    );
  }
}
