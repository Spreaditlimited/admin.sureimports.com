import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  const formData = await request.formData();
  const pidAdminUser = formData.get('pidAdminUser') as string;
  const accountName = formData.get('accountName') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const email = formData.get('email') as string;
  const phone = formData.get('phone') as string;
  const password = formData.get('password') as string;
  const authorizationLevel = formData.get('authorizationLevel') as string;
  const serviceKeysRaw = formData.get('serviceKeys') as string | null;

  let serviceKeys: string[] = [];
  if (serviceKeysRaw) {
    try {
      const parsed = JSON.parse(serviceKeysRaw);
      if (Array.isArray(parsed)) {
        serviceKeys = parsed.filter(
          (key): key is string => typeof key === 'string' && SERVICE_KEYS.has(key)
        );
      }
    } catch {
      serviceKeys = [];
    }
  }

  const existingUser = await prisma.admin.findUnique({ where: { userEmail: email } });
  if (existingUser) {
    return NextResponse.json(
      { statusx: 'USER_EXISTS', message: 'Admin User already exists!' },
      { status: 401 }
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const now = new Date();

  const admin = await prisma.$transaction(async (tx) => {
    const createdAdmin = await tx.admin.create({
      data: {
        pidUser: pidAdminUser,
        userFirstname: firstName,
        userLastname: lastName,
        userEmail: email,
        userPhone: Number.parseInt(phone, 10),
        userPassword: hashedPassword,
        userStatus: authorizationLevel,
        userExt1: accountName,
        createdAt: now,
      },
    });

    if (serviceKeys.length > 0 && authorizationLevel !== 'L1') {
      await tx.admin_permissions.createMany({
        data: serviceKeys.map((serviceKey) => ({
          pidPermission: `ADMPERM_${pidAdminUser}_${serviceKey}`,
          pidUser: pidAdminUser,
          serviceKey,
          canView: true,
          canEdit: false,
          createdAt: now,
          updatedAt: now,
        })),
      });
    }

    return createdAdmin;
  });

  if (admin && admin.id) {
    return NextResponse.json(
      { statusx: 'SUCCESS', message: 'Admin User was successfuly created.' },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { statusx: 'FAILED', message: 'Admin User Creation Failed!' },
    { status: 401 }
  );
}
