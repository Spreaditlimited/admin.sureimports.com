import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import xMail from '@/lib/email/xMail2';
import { sendApprovedWhatsAppStatusTemplate } from '@/lib/notifications/whatsappTemplate';

const PAY_SUPPLIER_SERVICE_NAME = 'Pay Supplier';

function getCustomerName(user: any) {
  return [user?.userFirstname, user?.userLastname].filter(Boolean).join(' ').trim() || user?.userFirstname || 'Customer';
}

function getEmailContent(newStatus: string, pidOrder: string, firstName: string, message: string) {
  const adminMessage = `<br /><br /> <b>::::: Admin Message :::::</b><br />${message ? message : 'No message available.'}`;

  if (newStatus === 'paid-supplier') {
    return {
      statusx: 'SUCCESS',
      responseMessage: 'Request has been successfully marked paid.',
      xTitle: 'Supplier has been paid',
      xBodyTitle: 'Supplier has been paid',
      xBody1:
        `Hello ${firstName},` +
        `<p>Your Pay Supplier request with ID: <b>${pidOrder}</b> has been successfully paid to your supplier.</p>` +
        `<p>Thank you for doing business with Sure Imports Pay Supplier.</p>` +
        `<p>Log into your Sure Imports account to view this request.</p>` +
        adminMessage,
    };
  }

  if (newStatus === 'request-cancelled') {
    return {
      statusx: 'CANCELLED',
      responseMessage: 'Request has been successfully cancelled.',
      xTitle: 'Request Cancelled',
      xBodyTitle: 'Pay Supplier Request has been cancelled',
      xBody1:
        `Hello ${firstName},` +
        `<p>Your Pay Supplier request with ID: <b>${pidOrder}</b> has been cancelled.</p>` +
        `<p>You may contact the Sure Imports Processing Team for further clarity on this cancellation.</p>` +
        `<p>Log into your Sure Imports account, go to <b>Pay Supplier Services</b> to view this request.</p>` +
        adminMessage,
    };
  }

  return null;
}

function createPid(prefix: string) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`;
}

function toAmount(value: unknown) {
  const amount = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

async function sendAdminMessageEmail({
  user,
  pidOrder,
  newStatus,
  message,
}: {
  user: any;
  pidOrder: string;
  newStatus: string;
  message: string;
}) {
  await xMail({
    xEmail: user?.userEmail || '',
    xTitle: 'Sure Imports',
    xBodyTitle: 'Special Admin Message',
    xBody1:
      `Hello ${user?.userFirstname || 'Customer'},` +
      `<p>Find the admin message below for your Pay Supplier request with ID: <b>${pidOrder}</b>.</p>` +
      `<p>You may contact the admin for further clarification.</p>` +
      `<p>You may also log into your Sure Imports account and go to Pay Supplier Services to view this request.</p>` +
      `<br /><br /> <b>::::: Admin Message :::::</b><br />${message ? message : 'No message available.'}`,
    xBody2: '',
    xButtonTitle: '',
    xButtonLink: '',
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const pidUser = String(formData.get('pidUser') || '').trim();
  const pidOrder = String(formData.get('pidOrder') || '').trim();
  const newStatus = String(formData.get('newStatus') || '').trim();
  const message = String(formData.get('message') || '').trim();
  const pidMessage = String(formData.get('pidMessage') || `MSG${Date.now()}`).trim();

  if (!pidUser || !pidOrder || !newStatus) {
    return NextResponse.json(
      { statusx: 'ACTION_FAILED', message: 'Missing Pay Supplier request details.' },
      { status: 400 },
    );
  }

  const user = await prisma.users.findUnique({
    where: { pidUser },
  });

  if (!user) {
    return NextResponse.json(
      { statusx: 'ACTION_FAILED', message: 'Customer account was not found.' },
      { status: 404 },
    );
  }

  const paySupplierRequest = await prisma.pay_supplier.findUnique({
    where: { pidPaySupplier: pidOrder },
  });

  if (!paySupplierRequest || paySupplierRequest.pidUser !== pidUser) {
    return NextResponse.json(
      { statusx: 'ACTION_FAILED', message: 'Pay Supplier request was not found.' },
      { status: 404 },
    );
  }

  if (newStatus === 'message') {
    await prisma.messages.create({
      data: {
        pidMessage,
        pidOrder,
        pidFrom: 'hello@sureimports.com',
        pidTo: user.userEmail,
        fullName: user.userFirstname,
        messageTitle: 'Admin Message: PAY SUPPLIER',
        messageContent: message,
        messageStatus: 'unread',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await sendAdminMessageEmail({ user, pidOrder, newStatus, message });

    return NextResponse.json(
      { statusx: 'SUCCESS_MESSAGE', message: 'Message has been successfully sent.' },
      { status: 200 },
    );
  }

  if (!['paid-supplier', 'request-cancelled'].includes(newStatus)) {
    return NextResponse.json(
      { statusx: 'ACTION_FAILED', message: 'Unsupported Pay Supplier status transition.' },
      { status: 400 },
    );
  }

  await prisma.messages.create({
    data: {
      pidMessage,
      pidOrder,
      pidFrom: 'hello@sureimports.com',
      pidTo: user.userEmail,
      fullName: user.userFirstname,
      messageTitle: `Pay Supplier Status: ${newStatus.toUpperCase()}`,
      messageContent: message,
      messageStatus: 'unread',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.pay_supplier.update({
      where: { pidPaySupplier: pidOrder },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    if (newStatus === 'paid-supplier') {
      const existingPayment = await tx.payments.findFirst({
        where: {
          serviceID: pidOrder,
          serviceName: PAY_SUPPLIER_SERVICE_NAME,
          paymentStatus: 'PAID',
        },
        select: { id: true },
      });

      if (!existingPayment) {
        const paidAt = new Date();
        const amount = toAmount(paySupplierRequest.amountToPayInNaira || paySupplierRequest.amount_to_pay);
        await tx.payments.create({
          data: {
            pidPayment: createPid('PMT'),
            pidUser,
            payerName: getCustomerName(user),
            payerEmail: user.userEmail || null,
            txID: `PAY-SUPPLIER-${pidOrder}`,
            txRef: pidOrder,
            paymentStatus: 'PAID',
            paymentType: 'PAY_SUPPLIER_MARK_PAID',
            currency: 'NGN',
            amount,
            serviceID: pidOrder,
            serviceName: PAY_SUPPLIER_SERVICE_NAME,
            serviceDescription: `Pay Supplier request marked paid for ${paySupplierRequest.supplierName || 'supplier'}`,
            txDateProcesser: paidAt.toISOString(),
            txDateServer: paidAt.toISOString(),
            xStatus: 'active',
          },
        });
      }
    }
  });

  const emailContent = getEmailContent(newStatus, pidOrder, user.userFirstname || 'Customer', message);
  if (!emailContent) {
    return NextResponse.json(
      { statusx: 'ACTION_FAILED', message: 'Unable to build Pay Supplier notification.' },
      { status: 500 },
    );
  }

  await Promise.allSettled([
    xMail({
      xEmail: user.userEmail || '',
      xTitle: emailContent.xTitle,
      xBodyTitle: emailContent.xBodyTitle,
      xBody1: emailContent.xBody1,
      xBody2: '',
      xButtonTitle: '',
      xButtonLink: '',
    }),
    sendApprovedWhatsAppStatusTemplate({
      requestId: pidOrder,
      serviceName: PAY_SUPPLIER_SERVICE_NAME,
      businessName: PAY_SUPPLIER_SERVICE_NAME,
      contactPersonFullName: getCustomerName(user),
      contactEmail: user.userEmail || '',
      whatsappNumber: user.userPhone || '',
      status: newStatus,
      cancellationReason: newStatus === 'request-cancelled' ? message : '',
    }),
  ]);

  return NextResponse.json(
    { statusx: emailContent.statusx, message: emailContent.responseMessage },
    { status: 200 },
  );
}
