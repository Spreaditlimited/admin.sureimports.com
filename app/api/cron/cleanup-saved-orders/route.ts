import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import xMail from '@/lib/email/xMail2';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const DEFAULT_EXPIRY_DAYS = 7;

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
    xBodyTitle: 'Saved Order Automatically Removed',
    xBody1: `Hello ${input.firstName || 'Customer'},<br />Your saved order exceeded the unpaid holding window and has been automatically removed.`,
    xBody2: `${detailsTable}<br />If you still need this order, please create it again from your dashboard.`,
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
          in: ['saved', 'bank-pending-saved-orders'],
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

    const notifications = await Promise.allSettled(
      staleOrders.map(async (order) => {
        try {
          const user = await prisma.users.findUnique({
            where: { pidUser: order.pidUser },
            select: { userEmail: true, userFirstname: true },
          });

          if (!user?.userEmail) return;

          await notifyOrderAutoDeletion({
            email: user.userEmail,
            firstName: user.userFirstname || 'Customer',
            pidOrder: order.pidOrder,
            createdAt: order.createdAt,
            productNames: (order.products || []).map((p) => p.productName || '').filter(Boolean),
            expiryDays,
          });
        } catch (error) {
          console.error(`Failed to send saved-order expiry email for ${order.pidOrder}`, error);
        }
      })
    );

    const deletedPids: string[] = [];
    for (const order of staleOrders) {
      await prisma.orders.delete({ where: { pidOrder: order.pidOrder } });
      deletedPids.push(order.pidOrder);
    }

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Stale saved orders cleanup completed',
      deletedCount: deletedPids.length,
      deletedOrderIds: deletedPids,
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
