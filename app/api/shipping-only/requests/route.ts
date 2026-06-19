import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { quickCreateCustomer, type QuickCreateCustomerInput } from '@/lib/customers/quickCreateCustomer';

const SHIPPING_ONLY_SERVICE_KEY = 'shipping_only';

function generatePidShippingOnly() {
  return `SL${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['true', 'yes', '1', 'on'].includes(normalized);
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireAdminServiceAccess(SHIPPING_ONLY_SERVICE_KEY, 'edit');
    if (!access.ok) return access.response;

    const body = await request.json();
    const customerMode = String(body?.customerMode || '').trim();
    let pidUser = String(body?.pidUser || '').trim();
    let customer:
      | {
          pidUser: string;
          userFirstname: string | null;
          userLastname: string | null;
          userEmail: string;
          userPhone: string | null;
        }
      | null = null;
    let setupLinkSent = false;

    if (customerMode === 'new' || !pidUser) {
      const created = await quickCreateCustomer(body?.customer as QuickCreateCustomerInput);
      pidUser = created.data.pidUser;
      customer = created.data;
      setupLinkSent = created.setupLinkSent;
    } else {
      customer = await prisma.users.findUnique({
        where: { pidUser },
        select: {
          pidUser: true,
          userFirstname: true,
          userLastname: true,
          userEmail: true,
          userPhone: true,
        },
      });
      if (!customer) {
        return NextResponse.json(
          { statusx: 'ERROR', message: 'Selected customer was not found' },
          { status: 400 },
        );
      }
    }

    const shippingName = String(body?.shippingName || '').trim();
    const shippingTo = String(body?.shippingTo || '').trim();
    const shippingPlan = String(body?.shippingPlan || '').trim();
    const grossWeight = String(body?.grossWeight || '').trim();
    const whatsappNumber = String(body?.whatsappNumber || customer?.userPhone || '').trim();

    if (!shippingName) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Shipping name is required' }, { status: 400 });
    }
    if (!shippingTo) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Destination is required' }, { status: 400 });
    }
    if (!shippingPlan) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Shipping plan is required' }, { status: 400 });
    }
    if (!grossWeight) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Gross weight is required' }, { status: 400 });
    }

    const created = await prisma.shipping_only.create({
      data: {
        pidShippingOnly: generatePidShippingOnly(),
        pidUser,
        whatsappNumber: whatsappNumber || null,
        shippingName,
        shippingTo,
        grossWeight,
        trackingNumber: String(body?.trackingNumber || '').trim() || null,
        shippingPlan,
        expectedShipments: String(body?.expectedShipments || '').trim() || null,
        wantProductVerification: toBoolean(body?.wantProductVerification),
        wantConsolidation: toBoolean(body?.wantConsolidation),
        multipleSuppliers: toBoolean(body?.multipleSuppliers),
        description: String(body?.description || '').trim() || null,
        status: 'request-received',
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        statusx: 'SUCCESS',
        data: {
          request: created,
          customer,
          setupLinkSent,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error
        ? Number((error as { statusCode?: number }).statusCode) || 500
        : 500;
    const message = error instanceof Error ? error.message : 'Failed to create shipping-only request';

    return NextResponse.json(
      { statusx: 'ERROR', message, error: message },
      { status: statusCode },
    );
  }
}
