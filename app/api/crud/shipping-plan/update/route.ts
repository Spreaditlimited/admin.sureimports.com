import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const SHIPPING_PLANS_SERVICE_KEY = 'shipping_plans';
const UNPAID_PROCUREMENT_STATUSES = ['saved', 'on-hold'];

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function refreshUnpaidProcurementOrdersForPlan(pidShippingPlan: string, shippingPlanRate: number) {
  const exRate = await prisma.exchange_rate.findUnique({
    where: { id: 1 },
    select: {
      service_charge: true,
      vat: true,
      exNairaToDollar: true,
      exYuanToDollar: true,
      exNairaToYuan: true,
    },
  });

  const exYuanToDollar = toNumber(exRate?.exYuanToDollar, 7.5);
  const serviceCharge = toNumber(exRate?.service_charge, 15);
  const vat = toNumber(exRate?.vat, 7);

  const orders = await prisma.orders.findMany({
    where: {
      shippingPlan: pidShippingPlan,
      status: { in: UNPAID_PROCUREMENT_STATUSES },
      products: { some: {} },
    },
    select: {
      pidOrder: true,
      currencyType: true,
      products: {
        select: {
          productQuantity: true,
          productPrice: true,
          productWeight: true,
        },
      },
    },
  });

  await Promise.all(
    orders.map((order) => {
      const productsTotal = order.products.reduce(
        (sum, product) => sum + toNumber(product.productQuantity) * toNumber(product.productPrice),
        0,
      );
      const productsWeight = order.products.reduce(
        (sum, product) => sum + toNumber(product.productQuantity) * toNumber(product.productWeight),
        0,
      );
      const productsTotalUsd = order.currencyType === 'CNY' ? productsTotal / exYuanToDollar : productsTotal;
      const shippingCost = productsWeight * shippingPlanRate + 5;
      const serviceChargeValue = productsTotalUsd * (serviceCharge / 100);
      const vatValue = serviceChargeValue * (vat / 100);
      const orderTotalCost = productsTotalUsd + shippingCost + serviceChargeValue + vatValue;

      return prisma.orders.update({
        where: { pidOrder: order.pidOrder },
        data: {
          orderShippingCost: shippingCost.toString(),
          orderTotalCost: orderTotalCost.toString(),
          vat: String(exRate?.vat ?? vat),
          serviceCharge: String(exRate?.service_charge ?? serviceCharge),
          exchangeRate1: String(exRate?.exNairaToDollar ?? 1550),
          exchangeRate2: String(exRate?.exYuanToDollar ?? exYuanToDollar),
          exchangeRate3: String(exRate?.exNairaToYuan ?? 205),
          updatedAt: new Date(),
        },
      });
    }),
  );

  return orders.length;
}

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess(SHIPPING_PLANS_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const pidShippingPlan = String(body?.pidShippingPlan || '').trim();
    const shippingPlanName = String(body?.shippingPlanName || '').trim();
    const shippingPlanRateRaw = body?.shippingPlanRate;
    const shippingPlanRate = Number(shippingPlanRateRaw);
    const shippingPlanUnitRaw = String(body?.shippingPlanUnit || 'KG').trim().toUpperCase();
    const shippingPlanUnit = shippingPlanUnitRaw === 'CBM' ? 'CBM' : 'KG';

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
        shippingPlanUnit,
        updatedAt: new Date(),
      },
      select: {
        pidShippingPlan: true,
        shippingPlanName: true,
        shippingPlanRate: true,
        shippingPlanUnit: true,
      },
    });
    const refreshedOrdersCount = await refreshUnpaidProcurementOrdersForPlan(pidShippingPlan, shippingPlanRate);

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Shipping plan updated',
      data: updated,
      refreshedOrdersCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: error?.message || 'Failed to update shipping plan' },
      { status: 500 }
    );
  }
}
