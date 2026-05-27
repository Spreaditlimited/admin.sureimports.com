import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export const ADMIN_SERVICE_KEY = "admin_mgt";

type AccessAction = "view" | "edit";

type AuthenticatedAdmin = {
  pidUser: string;
  userStatus: string | null;
};

function unauthorizedResponse() {
  return NextResponse.json(
    { statusx: "UNAUTHORIZED", message: "Unauthorized" },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return NextResponse.json(
    { statusx: "FORBIDDEN", message: "Forbidden" },
    { status: 403 }
  );
}

function isSuperAdmin(status: string | null) {
  return status === "superadmin" || status === "L1";
}

async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) return null;

  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { pidUser: true, userStatus: true },
  });

  if (!admin) return null;
  return { pidUser: admin.pidUser, userStatus: admin.userStatus ?? null };
}

async function hasServiceAccess(
  admin: AuthenticatedAdmin,
  serviceKey: string,
  action: AccessAction
) {
  if (isSuperAdmin(admin.userStatus)) return true;

  try {
    const permission = await (prisma as any).admin_permissions?.findFirst({
      where: {
        pidUser: admin.pidUser,
        serviceKey,
      },
      select: {
        canView: true,
        canEdit: true,
      },
    });

    if (!permission) return false;
    return action === "view" ? !!permission.canView : !!permission.canEdit;
  } catch {
    return false;
  }
}

export async function requireAdminServiceAccess(
  serviceKey: string,
  action: AccessAction
): Promise<
  | { ok: true; admin: AuthenticatedAdmin }
  | { ok: false; response: NextResponse }
> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return { ok: false, response: unauthorizedResponse() };
  }

  const allowed = await hasServiceAccess(admin, serviceKey, action);
  if (!allowed) {
    return { ok: false, response: forbiddenResponse() };
  }

  return { ok: true, admin };
}
