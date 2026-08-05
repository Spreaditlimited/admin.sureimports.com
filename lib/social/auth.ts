import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isSuperAdminStatus } from '@/lib/accessControl';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { SOCIAL_SERVICE_KEY } from '@/lib/social/config';

export type SocialAdmin = { pidUser: string; userEmail: string; userStatus: string | null };

export async function getSocialAdmin(action: 'view' | 'edit'): Promise<SocialAdmin | null> {
  const token = (await cookies()).get('token')?.value;
  if (!token) return null;
  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;
  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { pidUser: true, userEmail: true, userStatus: true },
  });
  if (!admin) return null;
  if (isSuperAdminStatus(admin.userStatus)) return admin;
  const permission = await prisma.admin_permissions.findFirst({
    where: { pidUser: admin.pidUser, serviceKey: SOCIAL_SERVICE_KEY },
    select: { canView: true, canEdit: true },
  });
  if (!permission || (action === 'view' ? !permission.canView : !permission.canEdit)) return null;
  return admin;
}

export async function requireSocialAdmin(action: 'view' | 'edit') {
  const admin = await getSocialAdmin(action);
  if (!admin) redirect('/dashboard');
  return admin;
}

export async function assertSocialAdmin(action: 'view' | 'edit') {
  const admin = await getSocialAdmin(action);
  if (!admin) throw new Error('Unauthorized');
  return admin;
}
