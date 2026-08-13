import { NextResponse } from 'next/server';

import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { downloadCloudinaryPdf } from '@/lib/cloudinary/download';
import { sendQuotationNotification } from '@/lib/notifications/quotations';
import { notifyCustomerCorporateGiftStatus } from '@/lib/notifications/corporateGifts';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_request: Request, context: { params: Promise<{ pidQuotation: string }> }) {
  const access = await requireAdminServiceAccess('invoicing', 'edit');
  if (!access.ok) return access.response;

  try {
    const { pidQuotation } = await context.params;
    const quotation = await prisma.quotation_builder_documents.findUnique({ where: { pidQuotation } });
    if (!quotation) {
      return NextResponse.json({ statusx: 'NOT_FOUND', message: 'Quotation not found.' }, { status: 404 });
    }
    if (!quotation.pidUser) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Link this quotation to a customer account before sending it.' }, { status: 400 });
    }
    if (!quotation.pdfPublicId) {
      return NextResponse.json({ statusx: 'ERROR', message: 'Quotation PDF is unavailable.' }, { status: 400 });
    }
    const user = await prisma.users.findUnique({ where: { pidUser: quotation.pidUser } });
    if (!user) {
      return NextResponse.json({ statusx: 'ERROR', message: 'The linked customer account could not be found.' }, { status: 400 });
    }
    const email = String(user.userEmail || '').trim();
    if (!email) {
      return NextResponse.json({ statusx: 'ERROR', message: 'The linked customer account has no email address.' }, { status: 400 });
    }

    const quoteData = quotation.quoteData as { title?: string } | null;
    const pdf = await downloadCloudinaryPdf(quotation.pdfPublicId);
    const customerName = `${user.userFirstname || ''} ${user.userLastname || ''}`.trim()
      || quotation.customerName
      || 'Customer';

    const pdfAttachment = {
      filename: `Sure-Imports-${quotation.quotationNumber}.pdf`,
      content: pdf,
      contentType: 'application/pdf',
    };

    let sourcingRequest = quotation.linkedRequestId
      ? await prisma.corporate_gift_request.findUnique({ where: { pidRequest: quotation.linkedRequestId } })
      : null;

    if (quotation.linkedRequestId && !sourcingRequest) {
      return NextResponse.json({ statusx: 'ERROR', message: 'The linked corporate sourcing request could not be found.' }, { status: 400 });
    }

    if (sourcingRequest?.status === 'Pending') {
      const notification = await notifyCustomerCorporateGiftStatus({
        requestId: sourcingRequest.pidRequest,
        businessName: sourcingRequest.businessName,
        contactPersonFullName: sourcingRequest.contactPersonFullName,
        contactEmail: sourcingRequest.contactEmail,
        whatsappNumber: sourcingRequest.whatsappNumber,
        status: 'Sourced',
        handledByName: sourcingRequest.handledByName,
        emailAttachments: [pdfAttachment],
      });
      const emailResult = notification.channels.find((channel) => channel.channel === 'email');
      if (!emailResult?.sent) {
        throw new Error(emailResult?.error || 'The quotation email could not be sent. The sourcing request was not advanced.');
      }
      sourcingRequest = await prisma.corporate_gift_request.update({
        where: { pidRequest: sourcingRequest.pidRequest },
        data: {
          status: 'Sourced',
          handledByPidUser: access.admin.pidUser,
        },
      });
    } else {
      await sendQuotationNotification({
        toEmail: email,
        customerName,
        quotationNumber: quotation.quotationNumber,
        quotationTitle: quoteData?.title,
        preparedAt: quotation.createdAt,
        pdfAttachment,
      });
    }

    const updated = await prisma.quotation_builder_documents.update({
      where: { pidQuotation },
      data: {
        lastSentAt: new Date(),
        lastSentByPidUser: access.admin.pidUser,
        sendCount: { increment: 1 },
        status: 'SENT',
      },
      select: { lastSentAt: true, sendCount: true },
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: updated,
      sourcingStatus: sourcingRequest?.status || null,
    });
  } catch (error) {
    return NextResponse.json(
      { statusx: 'ERROR', message: error instanceof Error ? error.message : 'Unable to send quotation.' },
      { status: 500 },
    );
  }
}
