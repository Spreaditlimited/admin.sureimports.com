import { after, NextResponse } from 'next/server';
import { requireAffiliatePayoutAdmin, trustedAdminRequest } from '@/lib/affiliate/adminAuth';
import { reviewAffiliateConversion } from '@/lib/affiliate/payoutOperations';
import { sendAffiliateAccountNotification } from '@/lib/affiliate/emailNotifications';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ pidConversion: string }> }) {
  if (!trustedAdminRequest(request)) return NextResponse.json({ message: 'Request not allowed.' }, { status: 403 });
  if (!(await requireAffiliatePayoutAdmin())) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  const { pidConversion } = await context.params;
  const body = await request.json().catch(() => ({}));
  const decision = String(body.decision || '').toUpperCase();
  if (!['AVAILABLE', 'VOIDED'].includes(decision)) return NextResponse.json({ message: 'Invalid review decision.' }, { status: 400 });
  try {
    const conversion = await reviewAffiliateConversion(pidConversion, decision as 'AVAILABLE' | 'VOIDED');
    after(() => sendAffiliateAccountNotification({
      affiliateId: conversion.affiliateId,
      eventKey: `commission:${decision.toLowerCase()}:${conversion.pidConversion}`,
      eventType: decision === 'AVAILABLE' ? 'COMMISSION_AVAILABLE' : 'COMMISSION_VOIDED',
      subject: decision === 'AVAILABLE' ? 'Your affiliate commission is now available' : 'An affiliate commission was voided',
      title: decision === 'AVAILABLE' ? 'Commission approved' : 'Commission voided',
      message: decision === 'AVAILABLE'
        ? 'Your commission has passed review and is now available for payout.'
        : 'This commission was found to be ineligible during review and has been removed from your payable balance.',
      facts: [
        { label: 'Service', value: conversion.serviceName },
        { label: 'Order reference', value: conversion.externalOrderReference },
        { label: 'Commission', value: new Intl.NumberFormat(conversion.commissionCurrency === 'NGN' ? 'en-NG' : 'en-US', { style: 'currency', currency: conversion.commissionCurrency }).format(Number(conversion.commissionAmount)) },
        { label: 'Status', value: decision === 'AVAILABLE' ? 'Available' : 'Voided' },
      ],
      actionLabel: 'Review commission ledger',
      actionPath: '/dashboard/earnings',
    }));
    return NextResponse.json({ status: decision });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Commission review failed.' }, { status: 400 });
  }
}
