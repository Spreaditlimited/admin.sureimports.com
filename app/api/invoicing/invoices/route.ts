import { documentSearch, listPage } from '@/lib/invoicing/documentSearch';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createUniqueInvoiceNumber,
  ensureInvoicingCoreTables,
  generatePid,
  getSuperAdminPidUsers,
  INVOICE_STATUSES,
  isSuperAdmin,
  requireAdmin,
  syncOverdueInvoices,
  toMoneyInput,
  unauthorized,
  writeAuditLog,
} from '../_lib/invoicing';
import {
  encodeShippingOnlyLinkedRequestId,
  parseInvoiceLinkedRequestId,
} from '@/lib/invoiceLinkedService';
import { getUserBusinessName, getUserBusinessNameMap } from '@/lib/userBusinessName';
import { createShippingCommissionSnapshot } from '@/lib/affiliate/shippingCommissions';

function buildCustomerDisplayName(contactName?: string | null, businessName?: string | null, fallbackName?: string | null) {
  const normalizedContact = String(contactName || '').trim();
  const normalizedBusiness = String(businessName || '').trim();
  const normalizedFallback = String(fallbackName || '').trim();
  const baseName = normalizedContact || normalizedFallback;
  if (!baseName && !normalizedBusiness) return null;
  if (baseName && normalizedBusiness) return `${baseName} (${normalizedBusiness})`;
  return baseName || normalizedBusiness;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const pidUser = searchParams.get('pidUser') || '';
    const search = searchParams.get('search') || '';
    const { page, limit: take, skip } = listPage(searchParams);

    await syncOverdueInvoices();
    let items: any[] = [];
    let totalCount = 0;
    {
      const filters: string[] = [];
      const values: any[] = [];
      if (status) {
        filters.push('status = ?');
        values.push(status);
      }
      if (pidUser) {
        filters.push('pidUser = ?');
        values.push(pidUser);
      }
      if (!isSuperAdmin(admin.userStatus)) {
        const superAdminPidUsers = await getSuperAdminPidUsers();
        if (superAdminPidUsers.length > 0) {
          const placeholders = superAdminPidUsers.map(() => '?').join(', ');
          filters.push(`(createdByPidUser IS NULL OR createdByPidUser NOT IN (${placeholders}))`);
          values.push(...superAdminPidUsers);
        }
      }
      const deepSearch = documentSearch('invoice', search);
      filters.push(deepSearch.sql);
      values.push(...deepSearch.values);
      const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM invoices ${whereSql} ORDER BY createdAt DESC, id DESC LIMIT ${take} OFFSET ${skip}`,
        ...values,
      );
      const countRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS totalCount FROM invoices ${whereSql}`,
        ...values,
      );

      items = rows;
      totalCount = Number(countRows?.[0]?.totalCount || 0);
    }

    const linkedRequestIds = Array.from(new Set(items.map((it: any) => String(it.linkedRequestId || '').trim()).filter(Boolean)));
    const corporateGiftIds = Array.from(
      new Set(
        linkedRequestIds
          .map((value) => parseInvoiceLinkedRequestId(value))
          .filter((entry) => entry.type === 'corporate-gift')
          .map((entry) => entry.id),
      ),
    );

    let giftMap = new Map<string, { businessName: string; contactPersonFullName: string; contactEmail: string }>();
    if (corporateGiftIds.length > 0) {
      const gifts = await prisma.corporate_gift_request.findMany({
        where: { pidRequest: { in: corporateGiftIds } },
        select: {
          pidRequest: true,
          businessName: true,
          contactPersonFullName: true,
          contactEmail: true,
        },
      });
      giftMap = new Map(gifts.map((g) => [g.pidRequest, g]));
    }

    const enrichedItems = items.map((it: any) => {
      const link = parseInvoiceLinkedRequestId(it.linkedRequestId);
      if (link.type !== 'corporate-gift') return it;
      const gift = giftMap.get(link.id);
      if (!gift) return it;
      const derivedName = buildCustomerDisplayName(
        gift.contactPersonFullName,
        gift.businessName,
        it.customerName,
      );
      return {
        ...it,
        customerName: derivedName || it.customerName,
        customerEmail: it.customerEmail || gift.contactEmail || null,
      };
    });

    const userBusinessMap = await getUserBusinessNameMap(
      enrichedItems.map((it: any) => String(it.pidUser || '')).filter(Boolean),
    );
    const finalItems = enrichedItems.map((it: any) => {
      const businessName = userBusinessMap.get(String(it.pidUser || ''));
      if (!businessName) return it;
      const baseName = String(it.customerName || '').trim() || String(it.customerEmail || '').trim() || 'Customer';
      const customerName = baseName.includes(`(${businessName})`) ? baseName : `${baseName} (${businessName})`;
      return { ...it, customerName };
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: finalItems,
      pagination: {
        page,
        limit: take,
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch invoices', error: error.message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const body = await request.json();
    const {
      pidUser,
      currency = 'NGN',
      dueAt,
      headerSnapshot,
      footerSnapshot,
      customerBusinessName: suppliedBusinessName,
      customerContactName: suppliedContactName,
      customerEmail: suppliedCustomerEmail,
      customerPhone: suppliedCustomerPhone,
      customerAddress: suppliedCustomerAddress,
      customerNotes,
      notes,
      linkedRequestId,
      linkedShippingOnlyId,
      pidQuotation,
      status = 'DRAFT',
      items = [],
      discountTotal = 0,
      taxTotal = 0,
      shippingCommissionQuantity,
    } = body;

    if (!pidUser) {
      return NextResponse.json({ statusx: 'ERROR', message: 'pidUser is required' }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ statusx: 'ERROR', message: 'At least one invoice item is required' }, { status: 400 });
    }

    if (!INVOICE_STATUSES.includes(status)) {
      return NextResponse.json({ statusx: 'ERROR', message: `Invalid status: ${status}` }, { status: 400 });
    }

    const existingUser = await prisma.users.findUnique({ where: { pidUser } });
    if (!existingUser) {
      return NextResponse.json({ statusx: 'ERROR', message: 'User not found. Invoice can only be issued to registered users.' }, { status: 400 });
    }

    const normalizedPidQuotation = String(pidQuotation || '').trim() || null;
    if (normalizedPidQuotation) {
      const quotation = await prisma.quotation_builder_documents.findUnique({
        where: { pidQuotation: normalizedPidQuotation },
        select: { pidUser: true, linkedRequestId: true, lastSentAt: true },
      });
      if (!quotation) {
        return NextResponse.json({ statusx: 'ERROR', message: 'Selected quotation was not found.' }, { status: 400 });
      }
      if (quotation.pidUser && quotation.pidUser !== pidUser) {
        return NextResponse.json({ statusx: 'ERROR', message: 'The selected quotation belongs to a different customer account.' }, { status: 400 });
      }
      if (quotation.linkedRequestId && quotation.linkedRequestId !== String(linkedRequestId || '').trim()) {
        return NextResponse.json({ statusx: 'ERROR', message: 'The quotation and corporate sourcing request do not match.' }, { status: 400 });
      }
      if (quotation.linkedRequestId && !quotation.lastSentAt) {
        return NextResponse.json({ statusx: 'ERROR', message: 'Send the corporate sourcing quotation before creating its invoice.' }, { status: 400 });
      }
    }

    let subtotalNum = 0;
    const normalizedItems = items.map((item: any, index: number) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      if (!item.description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid item at row ${index + 1}`);
      }
      const lineTotal = quantity * unitPrice;
      subtotalNum += lineTotal;
      return {
        pidInvoiceItem: generatePid('IVI'),
        lineNo: index + 1,
        description: String(item.description),
        quantity: quantity.toFixed(2),
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      };
    });

    const discount = Number(discountTotal) || 0;
    const tax = Number(taxTotal) || 0;
    const grandTotalNum = subtotalNum - discount + tax;
    if (grandTotalNum < 0) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Grand total cannot be negative' }, { status: 400 });
    }

    const pidInvoice = generatePid('INV');
    const invoiceNumber = await createUniqueInvoiceNumber();

    const userFullName = `${existingUser.userFirstname || ''} ${existingUser.userLastname || ''}`.trim() || null;
    let customerBusinessName = String(suppliedBusinessName || '').trim() || null;
    let customerContactName = String(suppliedContactName || '').trim() || userFullName;
    let customerEmail = String(suppliedCustomerEmail || '').trim() || existingUser.userEmail;
    let customerPhone = String(suppliedCustomerPhone || '').trim() || existingUser.userPhone || existingUser.phone || null;
    let customerAddress = String(suppliedCustomerAddress || '').trim() || [
      existingUser.address || existingUser.userShippingAddress,
      existingUser.userShippingAddress2,
      existingUser.userState,
      existingUser.userCountry || existingUser.country,
    ].filter(Boolean).join(', ') || null;
    const userBusinessName = await getUserBusinessName(pidUser);
    customerBusinessName = customerBusinessName || userBusinessName;

    const normalizedLinkedRequestId = linkedShippingOnlyId
      ? encodeShippingOnlyLinkedRequestId(String(linkedShippingOnlyId))
      : linkedRequestId;

    if (normalizedLinkedRequestId && !linkedShippingOnlyId) {
      const gift = await prisma.corporate_gift_request.findUnique({
        where: { pidRequest: normalizedLinkedRequestId },
        select: {
          businessName: true,
          contactPersonFullName: true,
          contactEmail: true,
        },
      });

      if (gift) {
        if (!normalizedPidQuotation) {
          return NextResponse.json({ statusx: 'ERROR', message: 'A corporate sourcing invoice must be created from its sent quotation.' }, { status: 400 });
        }
        customerBusinessName = customerBusinessName || gift.businessName || null;
        customerContactName = customerContactName || gift.contactPersonFullName || userFullName;
        customerEmail = gift.contactEmail || existingUser.userEmail;
      }
    }

    const invoiceCurrency = String(currency || '').trim().toUpperCase();
    if (!['NGN', 'USD'].includes(invoiceCurrency)) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Invoice currency must be NGN or USD.' }, { status: 400 });
    }
    if (linkedShippingOnlyId) {
      const linkedShippingRequest = await prisma.shipping_only.findUnique({
        where: { pidShippingOnly: String(linkedShippingOnlyId) },
        select: { pidUser: true, affiliateAttribution: { select: { id: true } } },
      });
      if (!linkedShippingRequest || linkedShippingRequest.pidUser !== pidUser) {
        return NextResponse.json({ statusx: 'ERROR', message: 'The shipping request and invoice customer do not match.' }, { status: 400 });
      }
      const commissionQuantity = Number(shippingCommissionQuantity);
      if (linkedShippingRequest.affiliateAttribution && (!Number.isFinite(commissionQuantity) || commissionQuantity <= 0)) {
        return NextResponse.json({ statusx: 'ERROR', message: 'Enter the final billable shipping quantity before creating this affiliate-owned invoice.' }, { status: 400 });
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoices.create({ data: {
        pidInvoice,
        invoiceNumber,
        pidUser,
        customerName: customerBusinessName || customerContactName,
        customerBusinessName,
        customerContactName,
        customerEmail,
        customerPhone,
        customerAddress,
        currency: invoiceCurrency,
        subtotal: toMoneyInput(subtotalNum),
        discountTotal: toMoneyInput(discount),
        taxTotal: toMoneyInput(tax),
        grandTotal: toMoneyInput(grandTotalNum),
        amountPaid: toMoneyInput(0),
        balanceDue: toMoneyInput(grandTotalNum),
        status,
        dueAt: dueAt ? new Date(dueAt) : null,
        headerSnapshot: headerSnapshot || null,
        footerSnapshot: footerSnapshot || null,
        customerNotes: customerNotes || null,
        notes: notes || null,
        linkedRequestId: normalizedLinkedRequestId || null,
        pidQuotation: normalizedPidQuotation,
        createdByPidUser: admin.pidUser,
        updatedByPidUser: admin.pidUser,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        items: true,
      },
      });
      if (linkedShippingOnlyId) {
        await createShippingCommissionSnapshot(tx, {
          pidInvoice: invoice.pidInvoice,
          pidShippingOnly: String(linkedShippingOnlyId),
          currency: invoiceCurrency,
          eligibleQuantity: shippingCommissionQuantity,
        });
      }
      return invoice;
    });

    await writeAuditLog({
      pidInvoice,
      pidUser: admin.pidUser,
      action: 'INVOICE_CREATED',
      newStatus: created.status,
      metadata: JSON.stringify({ invoiceNumber, itemCount: normalizedItems.length }),
    });

    return NextResponse.json({ statusx: 'SUCCESS', data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to create invoice', error: error.message },
      { status: 500 },
    );
  }
}
