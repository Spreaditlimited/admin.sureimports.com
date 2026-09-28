import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { isSuperAdminStatus } from "@/lib/accessControl";
import { prisma } from "@/lib/prisma";
export async function vehicleAdmin(edit = false, finance = false) {
  const token = (await cookies()).get("token")?.value;
  const payload = token
    ? (verifyToken(token) as { pidUser?: string } | null)
    : null;
  if (!payload?.pidUser) return null;
  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    include: { permissions: true },
  });
  if (!admin) return null;
  if (isSuperAdminStatus(admin.userStatus)) return admin;
  const permission = admin.permissions.find(
    (p) => p.serviceKey === (finance ? "invoicing" : "store_mgt"),
  );
  return (
    edit ? permission?.canEdit : permission?.canView || permission?.canEdit
  )
    ? admin
    : null;
}
