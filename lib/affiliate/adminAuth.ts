import 'server-only';

import { prisma } from '@/lib/prisma';
import { isSuperAdminStatus } from '@/lib/accessControl';
import { requireAdmin } from '@/app/api/invoicing/_lib/invoicing';

export async function requireAffiliateAdmin(action: 'view' | 'edit' = 'view') {
  const admin = await requireAdmin();
  if (!admin) return null;
  if (isSuperAdminStatus(admin.userStatus)) return admin;
  const permission = await prisma.admin_permissions.findFirst({
    where: {
      pidUser: admin.pidUser,
      serviceKey: 'payout_requests',
      ...(action === 'edit' ? { canEdit: true } : { canView: true }),
    },
    select: { id: true },
  });
  return permission ? admin : null;
}

export async function requireAffiliatePayoutAdmin() {
  return requireAffiliateAdmin('view');
}

export function trustedAdminRequest(request: Request) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) return false;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
