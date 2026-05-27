import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_SERVICE_KEY, requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

export async function GET(request: NextRequest) {
  const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'view');
  if (!access.ok) return access.response;

  try {
    const adminUsers = await prisma.admin.findMany({
      select: {
        id: true,
        pidUser: true,
        userFirstname: true,
        userLastname: true,
        userEmail: true,
        userPhone: true,
        userStatus: true,
        userExt1: true,
        createdAt: true,
      },
      orderBy: [{ id: 'asc' }],
    });

    return NextResponse.json(adminUsers);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
