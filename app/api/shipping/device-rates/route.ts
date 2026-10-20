import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { getDeviceShippingSettings } from '@/lib/procurement/deviceShippingSettings';
export async function GET() {
  const access = await requireAdminServiceAccess('shipping_plans', 'view');
  if (!access.ok) return access.response;
  const edit = await requireAdminServiceAccess('shipping_plans', 'edit');
  return Response.json({ ...await getDeviceShippingSettings(), canEdit: edit.ok }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function PUT(request: Request) {
  const access = await requireAdminServiceAccess('shipping_plans', 'edit');
  if (!access.ok) return access.response;
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ message: 'Save from the admin dashboard.' }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ message: 'Invalid request.' }, { status: 400 }); }
  const { phoneNgn, laptopNgn, revision } = body;
  if (![phoneNgn, laptopNgn].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 10000000 && Math.abs(v * 100 - Math.round(v * 100)) < 0.000001) || !Number.isSafeInteger(revision) || revision < 0) return Response.json({ message: 'Enter valid positive naira rates with at most two decimal places.' }, { status: 400 });
  const changed = await prisma.$executeRaw`UPDATE nigeria_device_shipping_settings SET phoneNgn=${phoneNgn}, laptopNgn=${laptopNgn}, revision=revision+1, updatedBy=${access.admin.pidUser}, updatedAt=NOW(3) WHERE id=1 AND revision=${revision}`;
  if (!changed) return Response.json({ message: 'Rates changed in another session. Reload before saving.' }, { status: 409 });
  return Response.json({ ...await getDeviceShippingSettings(), canEdit: true });
}
