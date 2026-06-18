import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_SERVICE_KEY, requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const SERVICE_KEYS = new Set([
  'dashboard',
  'procurement',
  'corporate_gifts',
  'pay_supplier',
  'shipping_only',
  'verify_supplier',
  'pay_small_small',
  'store_mgt',
  'customer_accounts',
  'payout_requests',
  'invoicing',
  'admin_mgt',
  'shipping_plans',
  'exchange_rates',
  'blog_management',
]);

function isPrismaMissingTableError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2021';
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'view');
    if (!access.ok) return access.response;

    const pidUser = request.nextUrl.searchParams.get('pidUser');
    if (!pidUser) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'pidUser is required' },
        { status: 400 }
      );
    }

    const permissions = await prisma.admin_permissions.findMany({
      where: { pidUser },
      select: { serviceKey: true, canView: true, canEdit: true },
      orderBy: { serviceKey: 'asc' },
    });

    return NextResponse.json({ statusx: 'SUCCESS', permissions }, { status: 200 });
  } catch (error: unknown) {
    const isMissingTable = isPrismaMissingTableError(error);
    return NextResponse.json(
      {
        statusx: 'FAILED',
        message: isMissingTable
          ? 'Permissions table is not available yet. Run Prisma migration to create admin_permissions.'
          : 'Failed to fetch permissions',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'edit');
    if (!access.ok) return access.response;

    const body = await request.json();
    const pidUser = typeof body?.pidUser === 'string' ? body.pidUser : '';
    const rawServiceKeys = Array.isArray(body?.serviceKeys) ? body.serviceKeys : [];

    if (!pidUser) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'pidUser is required' },
        { status: 400 }
      );
    }

    const targetAdmin = await prisma.admin.findUnique({
      where: { pidUser },
      select: { userStatus: true },
    });

    if (!targetAdmin) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Admin user not found' },
        { status: 404 }
      );
    }

    if (targetAdmin.userStatus === 'L1' || targetAdmin.userStatus === 'superadmin') {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Super admin permissions are implicit and cannot be edited here' },
        { status: 400 }
      );
    }

    const serviceKeys = rawServiceKeys.filter(
      (key: unknown): key is string => typeof key === 'string' && SERVICE_KEYS.has(key)
    );

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.admin_permissions.deleteMany({ where: { pidUser } });

      if (serviceKeys.length > 0) {
        await tx.admin_permissions.createMany({
          data: serviceKeys.map((serviceKey: string) => ({
            pidPermission: `ADMPERM_${pidUser}_${serviceKey}`,
            pidUser,
            serviceKey,
            canView: true,
            canEdit: true,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    });

    return NextResponse.json(
      { statusx: 'SUCCESS', message: 'Permissions updated successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const isMissingTable = isPrismaMissingTableError(error);
    return NextResponse.json(
      {
        statusx: 'FAILED',
        message: isMissingTable
          ? 'Permissions table is not available yet. Run Prisma migration to create admin_permissions.'
          : 'Failed to update permissions',
      },
      { status: 500 }
    );
  }
}
