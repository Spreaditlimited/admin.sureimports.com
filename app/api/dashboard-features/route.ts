import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { prisma } from '@/lib/prisma';
import { defaultFeatureRules, validateFeatureRules } from '@/lib/features/catalog';
export async function GET() {
  const access = await requireAdminServiceAccess('system_settings', 'view');
  if (!access.ok) return access.response;
  try {
    const rows = await prisma.$queryRaw<Array<{ rulesJson: string; revision: number; updatedAt: Date; updatedBy: string | null }>>`SELECT rulesJson,revision,updatedAt,updatedBy FROM dashboard_feature_settings WHERE id=1`;
    const row = rows[0];
    const rules: unknown = row ? JSON.parse(row.rulesJson) : defaultFeatureRules;
    if (!validateFeatureRules(rules)) throw Error('Invalid settings');
    return Response.json({ rules, revision: row?.revision ?? 0, updatedAt: row?.updatedAt ?? null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ message: 'Feature settings are unavailable. Check that the dashboard feature migration has been applied.' }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const access = await requireAdminServiceAccess('system_settings', 'edit');
  if (!access.ok) return access.response;
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ message: 'Invalid origin.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!validateFeatureRules(body?.rules) || !Number.isSafeInteger(body?.revision) || body.revision < 0) return Response.json({ message: 'Invalid settings. Reload and try again.' }, { status: 400 });
  try {
    const updated = await prisma.$executeRaw`UPDATE dashboard_feature_settings SET rulesJson=${JSON.stringify(body.rules)},revision=revision+1,updatedBy=${access.admin.pidUser},updatedAt=NOW(3) WHERE id=1 AND revision=${body.revision}`;
    if (updated !== 1) return Response.json({ message: 'These settings changed in another session. Reload before saving.' }, { status: 409 });
    return Response.json({ revision: body.revision + 1, message: 'Feature availability saved. Customers receive changes on their next dashboard refresh.' });
  } catch { return Response.json({ message: 'Unable to save feature availability. Please try again.' }, { status: 503 }); }
}
