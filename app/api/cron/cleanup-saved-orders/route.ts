import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import xMail from '@/lib/email/xMail2';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const DEFAULT_EXPIRY_DAYS = 14;

function getCutoffDate(expiryDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - expiryDays);
  return cutoff;
}

function hasValidCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return Boolean(token && token === expected);
}

async function notifyOrderAutoDeletion(input: {
  email: string;
  firstName: string;
  pidOrder: string;
  createdAt: Date | null;
  productNames: string[];
  expiryDays: number;
}) {
  const createdAtLabel = input.createdAt
    ? new Date(input.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'N/A';

  const products = input.productNames.length
    ? input.productNames.join(', ')
    : 'No product names available';

  const detailsTable = `
<table style="width:100%;border-collapse:collapse;margin-top:6px;border:1px solid #e5e7eb;">
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Order ID</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.pidOrder}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Saved Since</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${createdAtLabel}</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Expiry Window</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${input.expiryDays} day(s)</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f8fafc;"><b>Items</b></td><td style="padding:8px;border:1px solid #e5e7eb;">${products}</td></tr>
</table>`;

  await xMail({
    xEmail: input.email,
    xTitle: `Saved Order Expired - ${input.pidOrder}`,
    xBodyTitle: 'Saved Order Archived',
    xBody1: `Hello ${input.firstName || 'Customer'},<br />Your saved order exceeded the unpaid holding window and has been archived. Its details have been retained for recovery.`,
    xBody2: `${detailsTable}<br />If you still need this order or have already paid, contact support with this order ID before creating or paying for another order.`,
    xButtonTitle: 'Open Dashboard',
    xButtonLink: 'https://sureimports.com/dashboard',
  });
}

export async function GET(request: NextRequest) {
  const cronAuthorized = hasValidCronSecret(request);
  if (!cronAuthorized) {
    const access = await requireAdminServiceAccess('procurement', 'edit');
    if (!access.ok) return access.response;
    if (access.admin.userStatus !== 'superadmin' && access.admin.userStatus !== 'L1') {
      return NextResponse.json(
        { statusx: 'FORBIDDEN', message: 'Only super admins can run cleanup' },
        { status: 403 }
      );
    }
  }

  const expiryDays = Number(process.env.SAVED_ORDER_EXPIRY_DAYS || DEFAULT_EXPIRY_DAYS);
  const cutoff = getCutoffDate(Number.isFinite(expiryDays) && expiryDays > 0 ? expiryDays : DEFAULT_EXPIRY_DAYS);

  try {
    const staleOrders = await prisma.orders.findMany({
      where: {
        status: {
          in: ['saved'],
        },
        createdAt: {
          lte: cutoff,
        },
      },
      include: {
        products: {
          select: {
            productName: true,
          },
        },
      },
    });

    if (!staleOrders.length) {
      return NextResponse.json({
        statusx: 'SUCCESS',
        message: 'No stale saved orders found',
        deletedCount: 0,
      });
    }

    // Retain full records. Payment verification may arrive after the browser closes.
    // Lock and recheck immediately before archiving; a stale candidate list is unsafe.
    const archivedOrders: typeof staleOrders = [];
    for (const order of staleOrders) {
      const archived = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pidOrder FROM orders WHERE pidOrder=${order.pidOrder} FOR UPDATE`;
        const payments = await tx.payments.count({ where: { serviceID: order.pidOrder } });
        const checkouts = await tx.$queryRaw<{reference:string}[]>`SELECT reference FROM procurement_paystack_checkouts WHERE pidOrder=${order.pidOrder} AND status IN ('PENDING','PAID','REVIEW') LIMIT 1`;
        const partnerOrders = await tx.$queryRaw<{pidOrder:string}[]>`SELECT pidOrder FROM procurement_partner_orders WHERE pidOrder=${order.pidOrder} LIMIT 1`;
        if (payments || checkouts.length || partnerOrders.length) return false;
        const result = await tx.orders.updateMany({ where: { pidOrder: order.pidOrder, status: 'saved', createdAt: { lte: cutoff }, updatedAt: order.updatedAt }, data: { status: 'expired-saved', updatedAt: new Date() } });
        return result.count === 1;
      });
      if (archived) archivedOrders.push(order);
    }
    const notifications = await Promise.allSettled(archivedOrders.map(async order => {
      const user = await prisma.users.findUnique({ where: { pidUser: order.pidUser }, select: { userEmail: true, userFirstname: true } });
      if (!user?.userEmail) return;
      await notifyOrderAutoDeletion({ email: user.userEmail, firstName: user.userFirstname || 'Customer', pidOrder: order.pidOrder, createdAt: order.createdAt, productNames: order.products.map(p => p.productName || '').filter(Boolean), expiryDays });
    }));

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Expired unpaid drafts archived; records retained',
      deletedCount: 0,
      archivedCount: archivedOrders.length,
      archivedOrderIds: archivedOrders.map(order => order.pidOrder),
      notifiedCount: notifications.filter((n) => n.status === 'fulfilled').length,
    });
  } catch (error: any) {
    console.error('Saved order cleanup failed', error);
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to cleanup saved orders', error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
