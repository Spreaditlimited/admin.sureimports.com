import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { prisma } from '@/lib/prisma';
export async function GET() {
  const access = await requireAdminServiceAccess('system_settings', 'view');
  if (!access.ok) return access.response;
  const prices = await prisma.$queryRaw`SELECT planKey,priceUsdCents,extraCreditPriceUsdCents,revision FROM intelligence_usd_pricing ORDER BY planKey`;
  return Response.json({ prices }, { headers: { 'Cache-Control': 'no-store' } });
}
export async function PUT(request: Request) {
  const access = await requireAdminServiceAccess('system_settings', 'edit');
  if (!access.ok) return access.response;
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return Response.json({ message: 'Invalid origin.' }, { status: 403 });
  const body = await request.json().catch(() => null);
  const prices = body?.prices;
  if (!Array.isArray(prices) || prices.length !== 2 || new Set(prices.map(row => row?.planKey)).size !== 2 || prices.some(row => !row || !['starter','pro'].includes(row.planKey) || !Number.isInteger(row.revision) || row.revision < 0 || [row.priceUsdCents,row.extraCreditPriceUsdCents].some(value => !Number.isSafeInteger(value) || value < 0 || value > 10000000 || (value > 0 && value < 100)))) return Response.json({ message: 'Enter USD prices of at least $1, or 0 to disable new purchases.' }, { status: 400 });
  try {
    await prisma.$transaction(async tx => {
      for (const row of [...prices].sort((a,b) => a.planKey.localeCompare(b.planKey))) {
        const updated = await tx.$executeRaw`UPDATE intelligence_usd_pricing SET priceUsdCents=${row.priceUsdCents},extraCreditPriceUsdCents=${row.extraCreditPriceUsdCents},revision=revision+1,updatedAt=NOW(3) WHERE planKey=${row.planKey} AND revision=${row.revision}`;
        if (updated !== 1) throw Error('CONCURRENT_EDIT');
      }
    });
    return Response.json({ saved: true });
  } catch (error) {
    if ((error as Error).message === 'CONCURRENT_EDIT') return Response.json({ message: 'Pricing changed since you opened this page. Reload and try again.' }, { status: 409 });
    throw error;
  }
}
