import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  canAdminAccessInvoiceCreatedBy,
  canTransitionStatus,
  derivePaymentStatus,
  requireAdmin,
  syncOverdueInvoices,
  toMoneyInput,
  unauthorized,
  writeAuditLog,
} from '../../_lib/invoicing';
import { parseInvoiceLinkedRequestId } from '@/lib/invoiceLinkedService';
import { getUserBusinessName } from '@/lib/userBusinessName';
import { resolveInvoiceCustomerIdentity } from '@/lib/invoicing/invoiceCustomer';

function canEditInvoiceFinancials(status: string) {
  return ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(
    String(status || '').toUpperCase(),
  );
}

function deriveEditedInvoiceStatus(existingStatus: string, amountPaid: number, grandTotal: number) {
  if (String(existingStatus || '').toUpperCase() === 'DRAFT') return 'DRAFT';
  const paymentStatus = derivePaymentStatus(amountPaid, grandTotal);
  if (paymentStatus === 'ISSUED' && String(existingStatus || '').toUpperCase() === 'OVERDUE') {
    return 'OVERDUE';
  }
  return paymentStatus;
}

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
        paymentClaims: {
          where: { status: 'PENDING_CONFIRMATION' },
          orderBy: { claimedAt: 'asc' },
          select: {
            pidClaim: true,
            claimedAmount: true,
            currency: true,
            paymentReference: true,
            note: true,
            claimedAt: true,
            status: true,
          },
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
            phone: true,
            address: true,
            userShippingAddress: true,
            userShippingAddress2: true,
            userState: true,
            userCountry: true,
            country: true,
          },
        },
        quotation: {
          select: {
            pidQuotation: true,
            quotationNumber: true,
            customerName: true,
            status: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice not found' }, { status: 404 });
    }
    if (!(await canAdminAccessInvoiceCreatedBy(admin, invoice.createdByPidUser))) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Forbidden' }, { status: 403 });
    }

    let enrichedInvoice: any = invoice;
    const link = parseInvoiceLinkedRequestId(invoice.linkedRequestId);
    if (link.type === 'corporate-gift') {
      const gift = await prisma.corporate_gift_request.findUnique({
        where: { pidRequest: link.id },
        select: {
          businessName: true,
          contactPersonFullName: true,
          contactEmail: true,
        },
      });

      if (gift) {
        enrichedInvoice = {
          ...invoice,
          customerName: invoice.customerName || gift.businessName || gift.contactPersonFullName,
          customerBusinessName: invoice.customerBusinessName || gift.businessName || null,
          customerContactName: invoice.customerContactName || gift.contactPersonFullName || null,
          customerEmail: invoice.customerEmail || gift.contactEmail || null,
        };
      }
    }

    const userBusinessName = await getUserBusinessName(invoice.pidUser);
    const identity = resolveInvoiceCustomerIdentity(enrichedInvoice, userBusinessName);
    const profileAddress = [
      invoice.user.address || invoice.user.userShippingAddress,
      invoice.user.userShippingAddress2,
      invoice.user.userState,
      invoice.user.userCountry || invoice.user.country,
    ].filter(Boolean).join(', ');
    enrichedInvoice = {
      ...enrichedInvoice,
      customerName: identity.billedToName,
      customerBusinessName: identity.businessName,
      customerContactName: identity.contactName,
      customerPhone: enrichedInvoice.customerPhone || invoice.user.userPhone || invoice.user.phone || null,
      customerAddress: enrichedInvoice.customerAddress || profileAddress || null,
    };

    return NextResponse.json({ statusx: 'SUCCESS', data: enrichedInvoice });
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
    if (!(await canAdminAccessInvoiceCreatedBy(admin, existing.createdByPidUser))) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Forbidden' }, { status: 403 });
    }

    const data: any = {
      updatedByPidUser: admin.pidUser,
    };

    if (body.headerSnapshot !== undefined) data.headerSnapshot = body.headerSnapshot || null;
    if (body.footerSnapshot !== undefined) data.footerSnapshot = body.footerSnapshot || null;
    if (body.customerBusinessName !== undefined) data.customerBusinessName = body.customerBusinessName || null;
    if (body.customerContactName !== undefined) data.customerContactName = body.customerContactName || null;
    if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail || null;
    if (body.customerPhone !== undefined) data.customerPhone = body.customerPhone || null;
    if (body.customerAddress !== undefined) data.customerAddress = body.customerAddress || null;
    if (body.customerNotes !== undefined) data.customerNotes = body.customerNotes || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.pidQuotation !== undefined) {
      const nextPidQuotation = String(body.pidQuotation || '').trim() || null;
      if (nextPidQuotation) {
        const quotation = await prisma.quotation_builder_documents.findUnique({
          where: { pidQuotation: nextPidQuotation },
          select: { pidUser: true },
        });
        if (!quotation) {
          return NextResponse.json({ statusx: 'ERROR', message: 'Selected quotation was not found.' }, { status: 400 });
        }
        if (quotation.pidUser && quotation.pidUser !== existing.pidUser) {
          return NextResponse.json({ statusx: 'ERROR', message: 'The selected quotation belongs to a different customer account.' }, { status: 400 });
        }
      }
      data.pidQuotation = nextPidQuotation;
    }
    if (body.customerBusinessName !== undefined || body.customerContactName !== undefined) {
      data.customerName = String(body.customerBusinessName || body.customerContactName || existing.customerName || '').trim() || null;
    }
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
      if (!canEditInvoiceFinancials(existing.status)) {
        return NextResponse.json(
          { statusx: 'ERROR', message: `Line items cannot be edited while invoice is ${existing.status}` },
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
      data.status = deriveEditedInvoiceStatus(
        existing.status,
        currentAmountPaid,
        grandTotalNum,
      );
      data.paidAt = data.status === 'PAID' ? existing.paidAt || new Date() : null;

      await prisma.$transaction([
        prisma.invoice_items.deleteMany({ where: { pidInvoice } }),
        prisma.invoices.update({ where: { pidInvoice }, data }),
        prisma.invoice_items.createMany({ data: newItems.map((item: any) => ({ ...item, pidInvoice })) }),
      ]);

      await writeAuditLog({
        pidInvoice,
        pidUser: admin.pidUser,
        action:
          existing.status === 'DRAFT'
            ? 'INVOICE_UPDATED_ITEMS'
            : 'ISSUED_INVOICE_UPDATED_ITEMS',
        oldStatus: existing.status,
        newStatus: data.status,
        metadata: JSON.stringify({
          previousGrandTotal: String(existing.grandTotal),
          newGrandTotal: toMoneyInput(grandTotalNum),
          previousBalanceDue: String(existing.balanceDue),
          newBalanceDue: data.balanceDue,
          amountPaid: toMoneyInput(currentAmountPaid),
        }),
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
