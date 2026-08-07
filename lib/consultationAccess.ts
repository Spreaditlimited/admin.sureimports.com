import { cookies } from 'next/headers';

import { isSuperAdminStatus } from '@/lib/accessControl';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function getConsultationsAdminAccess() {
  const token = (await cookies()).get('token')?.value;
  if (!token) return null;

  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: {
      pidUser: true,
      userEmail: true,
      userFirstname: true,
      userLastname: true,
      userStatus: true,
      permissions: {
        where: { serviceKey: 'consultations' },
        select: { canView: true, canEdit: true },
      },
    },
  });
  if (!admin) return null;

  const isSuperAdmin = isSuperAdminStatus(admin.userStatus);
  const permission = admin.permissions[0];
  return {
    ...admin,
    canView:
      isSuperAdmin || Boolean(permission?.canView) || Boolean(permission?.canEdit),
    canEdit: isSuperAdmin || Boolean(permission?.canEdit),
  };
}

export async function requireConsultationsEditAccess() {
  const admin = await getConsultationsAdminAccess();
  if (!admin) throw new Error('Unauthorized');
  if (!admin.canEdit) throw new Error('Forbidden');
  return admin;
}
