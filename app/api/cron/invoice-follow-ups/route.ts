import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import {
  createOrGetInvoiceAccessToken,
  generatePid,
  syncOverdueInvoices,
} from '@/app/api/invoicing/_lib/invoicing';
import { getCustomerInvoiceBaseUrl } from '@/app/api/invoicing/_lib/customerInvoiceBaseUrl';
import {
  getInvoiceFollowUpSubject,
  sendInvoiceFollowUpNotification,
} from '@/lib/notifications/invoicing';
import { appendBusinessName, getUserBusinessName } from '@/lib/userBusinessName';
import { reconcileInvoicePayPalPayments } from '@/lib/invoicing/paypalReconciliation';

import { FOLLOW_UP_INTERVAL_MS, nextInvoiceFollowUp } from '@/lib/invoicing/followUpPolicy';
const DEFAULT_LIMIT = 100;

function hasValidCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return Boolean(token && token === expected);
}

async function reserveFollowUp(pidInvoice: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pidInvoice FROM invoices WHERE pidInvoice = ${pidInvoice} FOR UPDATE`;
    const invoice = await tx.invoices.findUnique({ where: { pidInvoice }, include: {
      user: true, followUps: true,
      paymentClaims: { where: { status: 'PENDING_CONFIRMATION' }, select: { pidClaim: true } },
    } });
    if (!invoice?.customerEmail) return null;
    const followUpNumber = nextInvoiceFollowUp({ ...invoice, pendingClaims: invoice.paymentClaims.length }, invoice.followUps);
    if (!followUpNumber) return null;
    const reservation = await tx.invoice_follow_ups.create({ data: {
      pidFollowUp: generatePid('IFU'), pidInvoice, followUpNumber,
      subject: getInvoiceFollowUpSubject(invoice.invoiceNumber, followUpNumber), status: 'SENDING',
    } });
    return { invoice, reservation, followUpNumber };
  });
}

export async function GET(request: NextRequest) {
  const cronAuthorized = hasValidCronSecret(request);
  if (!cronAuthorized) {
    const access = await requireAdminServiceAccess('invoicing', 'edit');
    if (!access.ok) return access.response;
    if (access.admin.userStatus !== 'superadmin' && access.admin.userStatus !== 'L1') {
      return NextResponse.json(
        { statusx: 'FORBIDDEN', message: 'Only super admins can run invoice follow-ups' },
        { status: 403 },
      );
    }
  }

  try {
    await syncOverdueInvoices();
    await reconcileInvoicePayPalPayments();

    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get('limit') || DEFAULT_LIMIT);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.floor(requestedLimit), 1), 250) : DEFAULT_LIMIT;
    const cutoff = new Date(Date.now() - FOLLOW_UP_INTERVAL_MS);
    // Filter exhausted and recently reminded invoices before LIMIT so they cannot
    // indefinitely block newer invoices from being processed.
    const candidates = await prisma.$queryRaw<Array<{ pidInvoice: string }>>`
      SELECT i.pidInvoice FROM invoices i
      LEFT JOIN (
        SELECT pidInvoice, COUNT(*) AS attempts, MAX(followUpNumber) AS sequence, MAX(sentAt) AS latest
        FROM invoice_follow_ups WHERE status IN ('SENT', 'SENDING', 'UNCERTAIN') GROUP BY pidInvoice
      ) f ON f.pidInvoice = i.pidInvoice
      WHERE i.status = 'OVERDUE' AND i.balanceDue > 0 AND i.customerEmail IS NOT NULL
        AND i.issuedAt IS NOT NULL AND i.dueAt <= ${cutoff}
        AND COALESCE(f.attempts, 0) < 3 AND COALESCE(f.sequence, 0) < 3
        AND (f.latest IS NULL OR f.latest <= ${cutoff})
        AND NOT EXISTS (SELECT 1 FROM invoice_payment_claims c WHERE c.pidInvoice = i.pidInvoice AND c.status = 'PENDING_CONFIRMATION')
      ORDER BY i.dueAt ASC, i.pidInvoice ASC LIMIT ${limit}
    `;

    const invoices = await prisma.invoices.findMany({
      where: {
        pidInvoice: { in: candidates.map(row => row.pidInvoice) },
        status: 'OVERDUE',
        balanceDue: { gt: 0 },
        customerEmail: { not: null },
        issuedAt: { not: null },
      },
      include: {
        user: true,
        paymentClaims: {
          where: { status: 'PENDING_CONFIRMATION' },
          select: { pidClaim: true },
        },
      },
      orderBy: { issuedAt: 'asc' },
      take: limit,
    });

    const customerBaseUrl = getCustomerInvoiceBaseUrl();
    const results = {
      checkedCount: invoices.length,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      skipped: [] as Array<{ pidInvoice: string; reason: string }>,
      failed: [] as Array<{ pidInvoice: string; error: string }>,
    };

    for (const candidate of invoices) {
      const reserved = await reserveFollowUp(candidate.pidInvoice);
      if (!reserved) {
        results.skippedCount += 1;
        results.skipped.push({ pidInvoice: candidate.pidInvoice, reason: 'Not eligible for another weekly reminder' });
        continue;
      }
      const { invoice, reservation, followUpNumber } = reserved;
      if (!invoice.customerEmail) {
        results.skippedCount += 1;
        results.skipped.push({ pidInvoice: invoice.pidInvoice, reason: 'Missing customer email' });
        continue;
      }

      if (invoice.paymentClaims.length > 0) {
        results.skippedCount += 1;
        results.skipped.push({ pidInvoice: invoice.pidInvoice, reason: 'Payment claim pending confirmation' });
        continue;
      }

      try {
        const token = await createOrGetInvoiceAccessToken({
          pidInvoice: invoice.pidInvoice,
          createdByPidUser: 'SYSTEM',
        });
        const businessName = await getUserBusinessName(invoice.pidUser);
        const customerName = appendBusinessName(
          invoice.customerName || invoice.user.userFirstname || 'Customer',
          businessName,
        ) || invoice.customerName || invoice.user.userFirstname || 'Customer';

        await sendInvoiceFollowUpNotification({
          toEmail: invoice.customerEmail,
          customerName,
          invoiceNumber: invoice.invoiceNumber,
          currency: invoice.currency,
          balanceDue: Number(invoice.balanceDue || 0),
          dueAt: invoice.dueAt,
          invoiceLink: `${customerBaseUrl}/invoice/${token.accessToken}`,
          followUpNumber,
        });

        await prisma.invoice_follow_ups.update({
          where: { pidFollowUp: reservation.pidFollowUp },
          data: { status: 'SENT', sentAt: new Date() },
        });
        results.sentCount += 1;
      } catch (error: any) {
        const message = error?.message || 'Unknown error';
        await prisma.invoice_follow_ups.update({
          where: { pidFollowUp: reservation.pidFollowUp },
          data: { status: 'UNCERTAIN', error: message },
        }).catch(() => null);
        results.failedCount += 1;
        results.failed.push({ pidInvoice: invoice.pidInvoice, error: message });
      }
    }

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Invoice follow-up run completed',
      data: results,
    });
  } catch (error: any) {
    console.error('Invoice follow-up cron failed', error);
    return NextResponse.json(
      { statusx: 'ERROR', message: 'Failed to run invoice follow-ups', error: error?.message || 'Unknown error' },
      { status: 500 },
    );
  }
}
