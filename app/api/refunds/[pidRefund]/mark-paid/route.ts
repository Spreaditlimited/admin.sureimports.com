import { prepareFailedPayPalRetry } from '@/lib/refunds/retry-paypal';
import { linkExternalPayPalRefund } from '@/lib/refunds/external-paypal';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { confirmForeignBankRefund } from '@/lib/refunds/settle-bank';
import { processOriginalPayPalRefund, checkOriginalPayPalRefund } from '@/lib/refunds/paypal-settlement';
import { reopenLegacyRefundRequest } from '@/lib/refunds/reopen-request';

export async function POST(request: NextRequest, { params }: { params: Promise<{ pidRefund: string }> }) {
  const access = await requireAdminServiceAccess('refunds', 'edit');
  if (!access.ok) return access.response;
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') return NextResponse.json({ message: 'Invalid origin.' }, { status: 403 });
  try {
    const { pidRefund } = await params;
    const text = await request.text();
    if (text.length > 4000) return NextResponse.json({ message: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);
    if (body.action === 'LINK_EXTERNAL_PAYPAL') {
      if (body.confirmed !== true) return NextResponse.json({ message: 'Confirm that this is the existing refund for this PayPal payment.' }, { status: 400 });
      const result = await linkExternalPayPalRefund(String(body.providerReference || '').trim(), pidRefund, access.admin.pidUser);
      return NextResponse.json({ statusx: 'SUCCESS', ...result });
    }
    if (body.action === 'PREPARE_PAYPAL_RETRY') return NextResponse.json(await prepareFailedPayPalRetry(pidRefund, String(body.legId || ''), access.admin.pidUser));
    if (body.action === 'CHECK_PAYPAL') {
      const providerReference = String(body.providerReference || '').trim();
      const result = await checkOriginalPayPalRefund(pidRefund, access.admin.pidUser, providerReference ? { legId: String(body.legId || ''), providerReference } : undefined);
      return NextResponse.json({ statusx: 'SUCCESS', message: result.status === 'SETTLED' ? 'PayPal confirmed the refund as completed.' : 'PayPal status checked. The refund is not yet confirmed complete; no new refund request was sent.', ...result });
    }
    if (body.action === 'REOPEN_LEGACY') {
      const result = await reopenLegacyRefundRequest(pidRefund, access.admin.pidUser, body.confirmedUnpaid === true);
      return NextResponse.json({ statusx: 'SUCCESS', ...result });
    }
    const refund = await prisma.refund_records.findUnique({ where: { pidRefund } });
    if (!refund) return NextResponse.json({ message: 'Refund not found.' }, { status: 404 });
    if (refund.refundStatus !== 'requested') return NextResponse.json({ message: 'This refund is not awaiting settlement. Refresh its status.' }, { status: 409 });
    if (body.method === 'PAYPAL') {
      if (body.confirmed !== true) return NextResponse.json({ message: 'Confirm that this refund should be sent to the original payment method.' }, { status: 400 });
      await processOriginalPayPalRefund(pidRefund, access.admin.pidUser);
      return NextResponse.json({ statusx: 'SUCCESS', message: 'PayPal processing checked. Refresh to see the confirmed settlement status.' });
    }
    const settled = await confirmForeignBankRefund({ refundId: pidRefund, reference: String(body.reference || '').trim(), adminId: access.admin.pidUser, confirmedAmount: String(body.confirmedAmount || ''), confirmedCurrency: String(body.confirmedCurrency || ''), destinationVerified: body.destinationVerified === true });
    return NextResponse.json({ statusx: 'SUCCESS', message: 'Refund settlement recorded. Customer notification is queued.', ...settled });
  } catch (error) {
    return NextResponse.json({ statusx: 'FAILED', message: error instanceof Error ? error.message : 'Unable to confirm this refund. Refresh its status.' }, { status: 409 });
  }
}
