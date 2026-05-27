import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ADMIN_SERVICE_KEY, requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

export async function GET(request: NextRequest) {
  const access = await requireAdminServiceAccess(ADMIN_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  const pidUser = request.nextUrl.searchParams.get('pidUser') as string;

  try {
    await prisma.admin.delete({
      where: { pidUser },
    });

    return NextResponse.json(
      { statusx: 'SUCCESS', message: 'Admin User was successfully deleted!' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { statusx: 'FAILED', message: 'Failed to delete admin user' },
      { status: 401 }
    );
  }
}
