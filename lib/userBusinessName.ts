import { prisma } from '@/lib/prisma';

export async function ensureUsersBusinessNameColumn() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS businessName VARCHAR(191) NULL`,
  );
}

export async function getUserBusinessName(pidUser: string): Promise<string | null> {
  if (!pidUser) return null;
  await ensureUsersBusinessNameColumn();
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT businessName FROM users WHERE pidUser = ? LIMIT 1`,
    pidUser,
  )) as Array<{ businessName: string | null }>;
  return rows[0]?.businessName || null;
}

export async function getUserBusinessNameMap(pidUsers: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(pidUsers.filter(Boolean)));
  const map = new Map<string, string>();
  if (ids.length === 0) return map;

  await ensureUsersBusinessNameColumn();
  const placeholders = ids.map(() => '?').join(', ');
  const rows = (await prisma.$queryRawUnsafe(
    `SELECT pidUser, businessName FROM users WHERE pidUser IN (${placeholders})`,
    ...ids,
  )) as Array<{ pidUser: string; businessName: string | null }>;

  rows.forEach((row) => {
    const name = String(row.businessName || '').trim();
    if (name) map.set(row.pidUser, name);
  });
  return map;
}

export function appendBusinessName(baseName: string | null | undefined, businessName: string | null | undefined) {
  const base = String(baseName || '').trim();
  const biz = String(businessName || '').trim();
  if (!biz) return base;
  if (!base) return biz;
  if (base.includes(`(${biz})`)) return base;
  return `${base} (${biz})`;
}
