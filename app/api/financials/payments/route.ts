import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const LEGACY_COMPLETED = new Set(['PAID', 'paid', 'SUCCESS', 'successful', 'success']);

type FinancialPaymentRow = {
  id: string;
  source: 'legacy_payments' | 'invoice_payments' | 'invoice_payment_claims';
  status: 'PENDING' | 'COMPLETED';
  amount: number;
  currency: string;
  paymentMethod: string;
  reference: string;
  serviceName: string;
  serviceType: 'CORPORATE_GIFT' | 'INVOICE' | 'ORDER' | 'OTHER';
  links: Array<{ label: string; href: string }>;
  customer: {
    pidUser: string;
    name: string;
    email: string;
    phone: string;
  };
  createdAt: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all').toLowerCase();
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;
    if (period === 'today') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (period === 'custom') {
      if (startDate) fromDate = new Date(`${startDate}T00:00:00.000Z`);
      if (endDate) toDate = new Date(`${endDate}T23:59:59.999Z`);
    }

    const [legacyPayments, invoicePayments, pendingClaims] = await Promise.all([
      prisma.payments.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      prisma.invoice_payments.findMany({
        orderBy: { paidAt: 'desc' },
        include: {
          user: {
            select: {
              pidUser: true,
              userFirstname: true,
              userLastname: true,
              userEmail: true,
              userPhone: true,
            },
          },
          invoice: {
            select: {
              pidInvoice: true,
              invoiceNumber: true,
              linkedRequestId: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
            },
          },
        },
        take: 500,
      }),
      prisma.invoice_payment_claims.findMany({
        where: { status: 'PENDING_CONFIRMATION' },
        orderBy: { claimedAt: 'desc' },
        include: {
          invoice: {
            select: {
              pidInvoice: true,
              invoiceNumber: true,
              linkedRequestId: true,
              customerName: true,
              customerEmail: true,
              customerPhone: true,
              pidUser: true,
            },
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
        take: 500,
      }),
    ]);
    const legacyUserIds = Array.from(new Set(legacyPayments.map((p) => p.pidUser).filter(Boolean)));
    const legacyServiceIds = Array.from(
      new Set(legacyPayments.map((p) => p.serviceID).filter((id): id is string => Boolean(id))),
    );
    const legacyInvoices = legacyServiceIds.length
      ? await prisma.invoices.findMany({
          where: { pidInvoice: { in: legacyServiceIds } },
          select: { pidInvoice: true, invoiceNumber: true, linkedRequestId: true },
        })
      : [];
    const legacyOrders = legacyServiceIds.length
      ? await prisma.orders.findMany({
          where: { pidOrder: { in: legacyServiceIds } },
          select: { pidOrder: true },
        })
      : [];
    const legacyUsers = legacyUserIds.length
      ? await prisma.users.findMany({
          where: { pidUser: { in: legacyUserIds } },
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
          },
        })
      : [];
    const usersByPid = new Map(legacyUsers.map((u) => [u.pidUser, u]));
    const invoiceByPid = new Map(legacyInvoices.map((inv) => [inv.pidInvoice, inv]));
    const orderIdSet = new Set(legacyOrders.map((o) => o.pidOrder));

    const legacyRows: FinancialPaymentRow[] = legacyPayments.map((row) => {
      const status = LEGACY_COMPLETED.has((row.paymentStatus || '').trim()) ? 'COMPLETED' : 'PENDING';
      const user = usersByPid.get(row.pidUser);
      const userName = [user?.userFirstname, user?.userLastname].filter(Boolean).join(' ').trim();
      const linkedInvoice = row.serviceID ? invoiceByPid.get(row.serviceID) : null;
      const links: Array<{ label: string; href: string }> = [];
      let serviceType: FinancialPaymentRow['serviceType'] = 'OTHER';
      let serviceName = row.serviceName || 'Legacy Payment';

      if (linkedInvoice) {
        serviceType = linkedInvoice.linkedRequestId ? 'CORPORATE_GIFT' : 'INVOICE';
        serviceName = linkedInvoice.linkedRequestId
          ? `Corporate Gift Payment - ${linkedInvoice.invoiceNumber}`
          : `Invoice Payment - ${linkedInvoice.invoiceNumber}`;
        links.push({ label: 'Invoice', href: `/dashboard/invoicing/${linkedInvoice.pidInvoice}` });
        if (linkedInvoice.linkedRequestId) {
          links.push({
            label: 'Gift Request',
            href: `/dashboard/corporate-gifts?pidRequest=${linkedInvoice.linkedRequestId}`,
          });
        }
      } else if (row.serviceID && orderIdSet.has(row.serviceID)) {
        serviceType = 'ORDER';
        links.push({ label: 'Order', href: `/dashboard/procurement?pidOrder=${row.serviceID}` });
      }

      return {
        id: row.pidPayment,
        source: 'legacy_payments',
        status,
        amount: Number(row.amount || 0),
        currency: row.currency || 'NGN',
        paymentMethod: row.paymentType || 'UNKNOWN',
        reference: row.txRef || row.txID,
        serviceName,
        serviceType,
        links,
        customer: {
          pidUser: row.pidUser,
          name: row.payerName || userName || 'Unknown Customer',
          email: row.payerEmail || user?.userEmail || 'N/A',
          phone: user?.userPhone || 'N/A',
        },
        createdAt: (row.createdAt || new Date()).toISOString(),
      };
    });

    const mirroredInvoicePaymentIds = new Set(
      legacyPayments
        .map((p) => p.txID)
        .filter((txID): txID is string => Boolean(txID)),
    );

    const invoiceRows: FinancialPaymentRow[] = invoicePayments
      .filter((row) => !mirroredInvoicePaymentIds.has(row.pidInvoicePayment))
      .map((row) => {
      const userName = [row.user?.userFirstname, row.user?.userLastname].filter(Boolean).join(' ').trim();
      const isCorporateGift = Boolean(row.invoice?.linkedRequestId);
      return {
        id: row.pidInvoicePayment,
        source: 'invoice_payments',
        status: 'COMPLETED',
        amount: Number(row.amount || 0),
        currency: row.currency || 'NGN',
        paymentMethod: row.paymentMethod,
        reference: row.reference || row.pidInvoicePayment,
        serviceName: isCorporateGift
          ? `Corporate Gift Payment - ${row.invoice?.invoiceNumber || ''}`.trim()
          : `Invoice Payment - ${row.invoice?.invoiceNumber || ''}`.trim(),
        serviceType: isCorporateGift ? 'CORPORATE_GIFT' : 'INVOICE',
        links: [
          { label: 'Invoice', href: `/dashboard/invoicing/${row.invoice?.pidInvoice}` },
          ...(row.invoice?.linkedRequestId
            ? [{ label: 'Gift Request', href: `/dashboard/corporate-gifts?pidRequest=${row.invoice.linkedRequestId}` }]
            : []),
        ],
        customer: {
          pidUser: row.pidUser,
          name: row.invoice?.customerName || userName || 'Invoice Customer',
          email: row.invoice?.customerEmail || row.user?.userEmail || 'N/A',
          phone: row.invoice?.customerPhone || row.user?.userPhone || 'N/A',
        },
        createdAt: row.paidAt.toISOString(),
      };
    });

    const pendingClaimRows: FinancialPaymentRow[] = pendingClaims.map((row) => {
      const userName = [row.user?.userFirstname, row.user?.userLastname].filter(Boolean).join(' ').trim();
      const isCorporateGift = Boolean(row.invoice?.linkedRequestId);
      return {
        id: row.pidClaim,
        source: 'invoice_payment_claims',
        status: 'PENDING',
        amount: Number(row.claimedAmount || 0),
        currency: row.currency || 'NGN',
        paymentMethod: 'CUSTOMER_CLAIM',
        reference: row.paymentReference || row.pidClaim,
        serviceName: isCorporateGift
          ? `Corporate Gift Claim - ${row.invoice?.invoiceNumber || ''}`.trim()
          : `Invoice Claim - ${row.invoice?.invoiceNumber || ''}`.trim(),
        serviceType: isCorporateGift ? 'CORPORATE_GIFT' : 'INVOICE',
        links: [
          { label: 'Invoice', href: `/dashboard/invoicing/${row.invoice?.pidInvoice}` },
          ...(row.invoice?.linkedRequestId
            ? [{ label: 'Gift Request', href: `/dashboard/corporate-gifts?pidRequest=${row.invoice.linkedRequestId}` }]
            : []),
        ],
        customer: {
          pidUser: row.invoice?.pidUser || row.pidUser || 'N/A',
          name: row.invoice?.customerName || userName || 'Invoice Customer',
          email: row.invoice?.customerEmail || row.user?.userEmail || 'N/A',
          phone: row.invoice?.customerPhone || row.user?.userPhone || 'N/A',
        },
        createdAt: row.claimedAt.toISOString(),
      };
    });

    const allRows = [...legacyRows, ...invoiceRows, ...pendingClaimRows];
    const rows = allRows
      .filter((row) => {
        const ts = new Date(row.createdAt).getTime();
        if (Number.isNaN(ts)) return false;
        if (fromDate && ts < fromDate.getTime()) return false;
        if (toDate && ts > toDate.getTime()) return false;
        return true;
      })
      .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      summary: {
        total: rows.length,
        pending: rows.filter((r) => r.status === 'PENDING').length,
        completed: rows.filter((r) => r.status === 'COMPLETED').length,
      },
      rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch financial payments', error: error.message },
      { status: 500 },
    );
  }
}
