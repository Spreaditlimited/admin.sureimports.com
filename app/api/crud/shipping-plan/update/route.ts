import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const SHIPPING_PLANS_SERVICE_KEY = 'shipping_plans';

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess(SHIPPING_PLANS_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const pidShippingPlan = String(body?.pidShippingPlan || '').trim();
    const shippingPlanName = String(body?.shippingPlanName || '').trim();
    const shippingPlanRateRaw = body?.shippingPlanRate;
    const shippingPlanRate = Number(shippingPlanRateRaw);

    if (!pidShippingPlan) {
      return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'pidShippingPlan is required' }, { status: 400 });
    }

    if (!shippingPlanName) {
      return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'Shipping plan name is required' }, { status: 400 });
    }

    if (!Number.isFinite(shippingPlanRate) || shippingPlanRate < 0) {
      return NextResponse.json({ statusx: 'INVALID_INPUT', message: 'Shipping plan rate must be a valid number' }, { status: 400 });
    }

    const updated = await prisma.shippingplan.update({
      where: { pidShippingPlan },
      data: {
        shippingPlanName,
        shippingPlanSlug: shippingPlanName,
        shippingPlanRate,
        updatedAt: new Date(),
      },
      select: {
        pidShippingPlan: true,
        shippingPlanName: true,
        shippingPlanRate: true,
      },
    });

    return NextResponse.json({ statusx: 'SUCCESS', message: 'Shipping plan updated', data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: error?.message || 'Failed to update shipping plan' },
      { status: 500 }
    );
  }
}
