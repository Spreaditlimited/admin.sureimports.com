import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import sendRefundPaidEmail from '@/lib/email/sendRefundPaidEmail';

const REFUNDS_SERVICE_KEY = 'payout_requests';

function parseAmount(value?: string | null) {
  const amount = Number.parseFloat(String(value || '0'));
  return Number.isFinite(amount) ? amount : 0;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pidRefund: string }> }
) {
  const access = await requireAdminServiceAccess(REFUNDS_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  try {
    const { pidRefund } = await params;
    const body = await request.json().catch(() => ({}));
    const reference = typeof body?.reference === 'string' ? body.reference.trim() : '';
    const note = typeof body?.note === 'string' ? body.note.trim() : '';

    if (!pidRefund) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'pidRefund is required' },
        { status: 400 }
      );
    }

    const refund = await prisma.refund_records.findUnique({
      where: { pidRefund },
    });

    if (!refund) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Refund record not found' },
        { status: 404 }
      );
    }

    if (String(refund.refundStatus || '').toLowerCase() === 'paid') {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Refund is already marked as paid' },
        { status: 400 }
      );
    }

    const user = refund.pidUser
      ? await prisma.users.findUnique({
          where: { pidUser: refund.pidUser },
          select: {
            userEmail: true,
            userFirstname: true,
            userLastname: true,
          },
        })
      : null;

    const paidAt = new Date();
    const settlementMeta = JSON.stringify({
      reference: reference || refund.ext1 || refund.pidRefund,
      note,
      markedPaidBy: access.admin.pidUser,
      paidAt: paidAt.toISOString(),
    });

    const updatedRefund = await prisma.refund_records.update({
      where: { pidRefund },
      data: {
        refundStatus: 'paid',
        ext2: settlementMeta,
        xStatus: 'PAID',
        updatedAt: paidAt,
      },
    });

    let emailSent = false;
    if (user?.userEmail) {
      const userName =
        `${user.userFirstname || ''} ${user.userLastname || ''}`.trim() ||
        'Customer';

      emailSent = await sendRefundPaidEmail({
        userEmail: user.userEmail,
        userName,
        pidRefund: updatedRefund.pidRefund,
        pidOrder: updatedRefund.pidOrder,
        amount: parseAmount(updatedRefund.amount),
        currency: updatedRefund.currency || 'NGN',
        serviceType: updatedRefund.serviceType,
        reference: reference || updatedRefund.ext1 || updatedRefund.pidRefund,
        paidAt: paidAt.toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      });
    }

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: emailSent
        ? 'Refund marked as paid and customer notification sent.'
        : 'Refund marked as paid. Customer notification could not be sent.',
      data: updatedRefund,
      emailSent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking refund paid:', error);
    return NextResponse.json(
      {
        statusx: 'ERROR',
        message: 'Failed to mark refund as paid',
        error: message,
      },
      { status: 500 }
    );
  }
}
