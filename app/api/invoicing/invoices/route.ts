import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createUniqueInvoiceNumber,
  ensureInvoicingCoreTables,
  generatePid,
  INVOICE_STATUSES,
  requireAdmin,
  syncOverdueInvoices,
  toMoneyInput,
  unauthorized,
  writeAuditLog,
} from '../_lib/invoicing';

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
    await ensureInvoicingCoreTables();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const pidUser = searchParams.get('pidUser') || '';
    const search = searchParams.get('search') || '';
    const page = Number(searchParams.get('page') || '1');
    const limit = Number(searchParams.get('limit') || '20');

    const skip = (Math.max(page, 1) - 1) * Math.max(limit, 1);
    const take = Math.min(Math.max(limit, 1), 100);

    await syncOverdueInvoices();
    const model = (prisma as any).invoices;
    let items: any[] = [];
    let totalCount = 0;

    if (model) {
      const where: any = {};
      if (status) where.status = status;
      if (pidUser) where.pidUser = pidUser;
      if (search) {
        where.OR = [
          { invoiceNumber: { contains: search } },
          { pidInvoice: { contains: search } },
          { customerName: { contains: search } },
          { customerEmail: { contains: search } },
        ];
      }

      [items, totalCount] = await Promise.all([
        model.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        model.count({ where }),
      ]);
    } else {
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
      if (search) {
        filters.push('(invoiceNumber LIKE ? OR pidInvoice LIKE ? OR customerName LIKE ? OR customerEmail LIKE ?)');
        const like = `%${search}%`;
        values.push(like, like, like, like);
      }
      const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM invoices ${whereSql} ORDER BY createdAt DESC LIMIT ${take} OFFSET ${skip}`,
        ...values,
      );
      const countRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS totalCount FROM invoices ${whereSql}`,
        ...values,
      );

      items = rows;
      totalCount = Number(countRows?.[0]?.totalCount || 0);
    }

    const linkedRequestIds = Array.from(
      new Set(
        items
          .map((it: any) => String(it.linkedRequestId || '').trim())
          .filter(Boolean),
      ),
    );

    let giftMap = new Map<string, { businessName: string; contactPersonFullName: string; contactEmail: string }>();
    if (linkedRequestIds.length > 0) {
      const gifts = await prisma.corporate_gift_request.findMany({
        where: { pidRequest: { in: linkedRequestIds } },
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
      const linkedId = String(it.linkedRequestId || '').trim();
      if (!linkedId) return it;
      const gift = giftMap.get(linkedId);
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

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: enrichedItems,
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
    await ensureInvoicingCoreTables();

    const body = await request.json();
    const {
      pidUser,
      currency = 'NGN',
      dueAt,
      headerSnapshot,
      footerSnapshot,
      notes,
      linkedRequestId,
      status = 'DRAFT',
      items = [],
      discountTotal = 0,
      taxTotal = 0,
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
    let customerName = userFullName;
    let customerEmail = existingUser.userEmail;

    if (linkedRequestId) {
      const gift = await prisma.corporate_gift_request.findUnique({
        where: { pidRequest: linkedRequestId },
        select: {
          businessName: true,
          contactPersonFullName: true,
          contactEmail: true,
        },
      });

      if (gift) {
        customerName = buildCustomerDisplayName(
          gift.contactPersonFullName,
          gift.businessName,
          userFullName,
        );
        customerEmail = gift.contactEmail || existingUser.userEmail;
      }
    }

    const created = await prisma.invoices.create({
      data: {
        pidInvoice,
        invoiceNumber,
        pidUser,
        customerName,
        customerEmail,
        customerPhone: existingUser.userPhone || existingUser.phone || null,
        currency,
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
        notes: notes || null,
        linkedRequestId: linkedRequestId || null,
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
