import 'server-only';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { supportStore } from './store';
import { supportEndpoints } from './http';
export const adminSupport = supportEndpoints(supportStore(prisma), async edit => {
  const access = await requireAdminServiceAccess('customer_support', edit ? 'edit' : 'view');
  if (!access.ok) return null;
  return { actor: { kind: 'AGENT', id: access.admin.pidUser, brand: 'SUPPORT_TEAM' } };
});

import { attachmentEndpoints } from './attachment-http';
export const adminAttachments=attachmentEndpoints(prisma,async edit=>{
 const access=await requireAdminServiceAccess('customer_support',edit?'edit':'view');
 return access.ok ? {actor:{kind:'AGENT' as const,id:access.admin.pidUser,brand:'SUPPORT_TEAM'}} : null;
});

import { managementEndpoints } from './management';
export const adminManagement=managementEndpoints(prisma,async edit=>{
 const access=await requireAdminServiceAccess('customer_support',edit?'edit':'view');
 return access.ok?{actor:{kind:'AGENT' as const,id:access.admin.pidUser,brand:'SUPPORT_TEAM'}}:null;
});
