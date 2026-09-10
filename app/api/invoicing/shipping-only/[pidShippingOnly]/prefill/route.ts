import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { shippingBillingUnit } from '@/lib/shipping/measurement';
import { requireAdmin, unauthorized } from '@/app/api/invoicing/_lib/invoicing';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pidShippingOnly: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return unauthorized();

    const { pidShippingOnly } = await params;
    const requestRecord = await prisma.shipping_only.findUnique({
      where: { pidShippingOnly },
      include: {
        affiliateAttribution: {
          include: { affiliate: { select: { referralCode: true } } },
        },
      },
    });

    if (!requestRecord) {
      return NextResponse.json(
        { statusx: 'ERROR', message: 'Shipping only request not found' },
        { status: 404 },
      );
    }

    const matchedUsers = requestRecord.pidUser
      ? await prisma.users.findMany({
          where: { pidUser: requestRecord.pidUser },
          select: {
            pidUser: true,
            userFirstname: true,
            userLastname: true,
            userEmail: true,
            userPhone: true,
          },
          take: 1,
        })
      : [];

    const plan = requestRecord.shippingPlan
      ? await prisma.shippingplan.findUnique({ where: { pidShippingPlan: requestRecord.shippingPlan }, include: { country: { select: { countryName: true } } } })
      : null;
    const billingUnit = shippingBillingUnit(plan?.country.countryName || requestRecord.shippingTo, plan?.shippingPlanName, plan?.shippingPlanUnit);
    const estimatedQuantity = Number.parseFloat(String(requestRecord.grossWeight || '').replace(/,/g, '')) || null;

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: {
        request: requestRecord,
        matchedUsers,
        commission: requestRecord.affiliateAttribution ? {
          ownerReferralCode: requestRecord.affiliateAttribution.affiliate.referralCode,
          sourceType: requestRecord.affiliateAttribution.sourceType,
          lockedAt: requestRecord.affiliateAttribution.lockedAt,
          billingUnit,
          estimatedQuantity,
          destinationCountry: plan?.country.countryName || requestRecord.shippingTo,
          shippingMode: String(plan?.shippingPlanName || '').toUpperCase().includes('SEA') ? 'SEA' : 'AIR',
        } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to fetch shipping-only prefill', error: error.message },
      { status: 500 },
    );
  }
}
