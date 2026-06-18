import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import xMail from '@/lib/email/xMail2';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import {
  getShippingOnlyNextStatus,
  getShippingOnlyStatusLabel,
  isShippingOnlyStatus,
  normalizeShippingOnlyStatus,
} from '@/lib/shippingOnlyStatus';
import { sendApprovedWhatsAppStatusTemplate } from '@/lib/notifications/whatsappTemplate';
import { encodeShippingOnlyLinkedRequestId } from '@/lib/invoiceLinkedService';

const SHIPPING_ONLY_SERVICE_KEY = 'shipping_only';

function normalizeDestinationName(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

async function isShippingOnlyInternationalDestination(destination: unknown) {
  const rawDestination = String(destination || '').trim();
  if (!rawDestination) return true;

  const country = await prisma.country.findFirst({
    where: {
      OR: [
        { pidCountry: rawDestination },
        { countrySlug: rawDestination },
        { countryName: rawDestination },
      ],
    },
    select: { countryName: true, countrySlug: true },
  });

  const resolvedDestination = normalizeDestinationName(
    country?.countryName || country?.countrySlug || rawDestination,
  );
  return resolvedDestination !== 'nigeria';
}

async function getLinkedShippingOnlyInvoice(pidShippingOnly: string) {
  return prisma.invoices.findFirst({
    where: { linkedRequestId: encodeShippingOnlyLinkedRequestId(pidShippingOnly) },
    orderBy: { createdAt: 'desc' },
    select: {
      pidInvoice: true,
      invoiceNumber: true,
      status: true,
      balanceDue: true,
    },
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const serviceType = String(formData.get('serviceType') || '');

  if (serviceType !== 'shipping-only') {
    return NextResponse.json(
      { responsex: { status: 'ACTION_FAILED', message: 'Unsupported service type.' } },
      { status: 400 },
    );
  }

  const access = await requireAdminServiceAccess(SHIPPING_ONLY_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  const pidUser = String(formData.get('pidUser') || '');
  const pidOrder = String(formData.get('pidOrder') || '');
  const action = String(formData.get('action') || '').trim().toLowerCase();
  const currentStatusFromUI = normalizeShippingOnlyStatus(String(formData.get('currentStatus') || ''));
  const newStatusFromClient = normalizeShippingOnlyStatus(String(formData.get('newStatus') || ''));
  const message = String(formData.get('message') || '').trim();
  const pidMessage =
    String(formData.get('pidMessage') || '') ||
    `MSG${Date.now()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  if (!pidUser || !pidOrder) {
    return NextResponse.json(
      { responsex: { status: 'ACTION_FAILED', message: 'Missing required fields.' } },
      { status: 400 },
    );
  }

  try {
    const [shippingRequest, user] = await Promise.all([
      prisma.shipping_only.findFirst({ where: { pidShippingOnly: pidOrder, pidUser } }),
      prisma.users.findUnique({ where: { pidUser } }),
    ]);

    if (!shippingRequest || !user) {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: 'Shipping request or customer account not found.',
          },
        },
        { status: 404 },
      );
    }

    const currentStatusFromRecord = normalizeShippingOnlyStatus(shippingRequest.status);
    if (!isShippingOnlyStatus(currentStatusFromRecord)) {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: `Unsupported existing shipping status "${shippingRequest.status}" for this request.`,
          },
        },
        { status: 400 },
      );
    }

    if (isShippingOnlyStatus(currentStatusFromUI) && currentStatusFromUI !== currentStatusFromRecord) {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: 'Shipping status changed in another session. Refresh and retry.',
          },
        },
        { status: 409 },
      );
    }

    const resolvedAction =
      action === 'approve' || action === 'decline'
        ? action
        : newStatusFromClient === 'request-cancelled'
          ? 'decline'
          : 'approve';
    const isInternational = await isShippingOnlyInternationalDestination(shippingRequest.shippingTo);
    const expectedNextStatus = getShippingOnlyNextStatus(
      currentStatusFromRecord,
      resolvedAction,
      isInternational,
    );

    if (!expectedNextStatus) {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: `Invalid transition from ${getShippingOnlyStatusLabel(currentStatusFromRecord)}.`,
          },
        },
        { status: 400 },
      );
    }

    if (isShippingOnlyStatus(newStatusFromClient) && newStatusFromClient !== expectedNextStatus) {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: `Invalid transition from ${getShippingOnlyStatusLabel(currentStatusFromRecord)} to ${getShippingOnlyStatusLabel(newStatusFromClient)}.`,
          },
        },
        { status: 400 },
      );
    }

    if (resolvedAction === 'approve' && isInternational && expectedNextStatus === 'invoiced') {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: 'Non-Nigeria shipping-only requests must be moved to Invoiced by issuing a linked invoice.',
          },
        },
        { status: 400 },
      );
    }

    if (resolvedAction === 'approve' && isInternational && expectedNextStatus === 'paid') {
      return NextResponse.json(
        {
          responsex: {
            status: 'ACTION_FAILED',
            message: 'Non-Nigeria shipping-only requests must be moved to Paid by recording payment on the linked invoice.',
          },
        },
        { status: 400 },
      );
    }

    if (resolvedAction === 'approve' && isInternational && expectedNextStatus === 'product-shipped') {
      const linkedInvoice = await getLinkedShippingOnlyInvoice(pidOrder);
      if (!linkedInvoice || linkedInvoice.status !== 'PAID' || Number(linkedInvoice.balanceDue || 0) > 0) {
        return NextResponse.json(
          {
            responsex: {
              status: 'ACTION_FAILED',
              message: 'Non-Nigeria shipping-only requests can only be shipped after the linked invoice is fully paid.',
            },
          },
          { status: 400 },
        );
      }
    }

    const newStatus = expectedNextStatus;

    await prisma.shipping_only.update({
      where: { pidShippingOnly: pidOrder },
      data: { status: newStatus, updatedAt: new Date() },
    });

    await prisma.messages.create({
      data: {
        pidMessage,
        pidOrder,
        pidFrom: 'admin@sureimports.com',
        pidTo: user.userEmail,
        fullName: user.userFirstname || '',
        messageTitle: `Shipping Only Status Update: ${getShippingOnlyStatusLabel(newStatus)}`,
        messageContent:
          message ||
          `Your Shipping Only request (${pidOrder}) has been moved to "${getShippingOnlyStatusLabel(newStatus)}".`,
        messageStatus: 'unread',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await Promise.allSettled([
      xMail({
        xEmail: user.userEmail,
        xTitle: `Shipping Only Update: ${getShippingOnlyStatusLabel(newStatus)}`,
        xBodyTitle: 'Your shipping request status has been updated',
        xBody1:
          `Hello ${user.userFirstname || 'Customer'},<br/>` +
          `Your Shipping Only request with ID <b>${pidOrder}</b> is now <b>${getShippingOnlyStatusLabel(newStatus)}</b>.`,
        xBody2: message
          ? `Admin note:<br/>${message}`
          : 'Log in to your dashboard to view full request details and progress.',
        xButtonTitle: 'View Dashboard',
        xButtonLink: 'https://www.sureimports.com/dashboard/shipping-only/request-received',
      }),
      sendApprovedWhatsAppStatusTemplate({
        requestId: pidOrder,
        serviceName: 'Shipping Only',
        businessName: 'Shipping Only',
        contactPersonFullName: user.userFirstname || 'Customer',
        contactEmail: user.userEmail,
        whatsappNumber: user.userPhone || '',
        status: getShippingOnlyStatusLabel(newStatus),
      }),
    ]);

    return NextResponse.json(
      {
        responsex: {
          status: 'SUCCESS',
          message: `Request moved to ${getShippingOnlyStatusLabel(newStatus)} successfully.`,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        responsex: {
          status: 'ACTION_FAILED',
          message: error?.message || 'Action failed. Please try again.',
        },
      },
      { status: 500 },
    );
  }
}
