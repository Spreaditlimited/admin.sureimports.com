import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import {
  createOrGetInvoiceAccessToken,
  ensureInvoicingCoreTables,
  generatePid,
  syncOverdueInvoices,
} from '@/app/api/invoicing/_lib/invoicing';
import { getCustomerInvoiceBaseUrl } from '@/app/api/invoicing/_lib/customerInvoiceBaseUrl';
import {
  getInvoiceFollowUpSubject,
  sendInvoiceFollowUpNotification,
} from '@/lib/notifications/invoicing';
import { appendBusinessName, getUserBusinessName } from '@/lib/userBusinessName';

const FIRST_FOLLOW_UP_HOURS = 24;
const REPEAT_FOLLOW_UP_HOURS = 48;
const DEFAULT_LIMIT = 100;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function hasValidCronSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return Boolean(token && token === expected);
}

async function getLastSentFollowUp(pidInvoice: string) {
  const rows: any[] = await prisma.$queryRawUnsafe(
    `
      SELECT followUpNumber, sentAt
      FROM invoice_follow_ups
      WHERE pidInvoice = ?
        AND status = 'SENT'
      ORDER BY sentAt DESC
      LIMIT 1
    `,
    pidInvoice,
  );

  return rows[0] || null;
}

async function recordFollowUp(input: {
  pidInvoice: string;
  followUpNumber: number;
  subject: string;
  status: 'SENT' | 'FAILED';
  error?: string | null;
}) {
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO invoice_follow_ups
      (pidFollowUp, pidInvoice, followUpNumber, subject, status, error, sentAt, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))
    `,
    generatePid('IFU'),
    input.pidInvoice,
    input.followUpNumber,
    input.subject,
    input.status,
    input.error || null,
  );
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
    await ensureInvoicingCoreTables();
    await syncOverdueInvoices();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || DEFAULT_LIMIT), 1), 250);
    const firstFollowUpCutoff = hoursAgo(FIRST_FOLLOW_UP_HOURS);
    const repeatFollowUpCutoff = hoursAgo(REPEAT_FOLLOW_UP_HOURS);

    const invoices = await prisma.invoices.findMany({
      where: {
        status: 'OVERDUE',
        balanceDue: { gt: 0 },
        customerEmail: { not: null },
        issuedAt: { not: null, lte: firstFollowUpCutoff },
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

    for (const invoice of invoices) {
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

      const lastFollowUp = await getLastSentFollowUp(invoice.pidInvoice);
      if (lastFollowUp?.sentAt && new Date(lastFollowUp.sentAt) > repeatFollowUpCutoff) {
        results.skippedCount += 1;
        results.skipped.push({ pidInvoice: invoice.pidInvoice, reason: 'Follow-up already sent within 48 hours' });
        continue;
      }

      const followUpNumber = Number(lastFollowUp?.followUpNumber || 0) + 1;
      const subject = getInvoiceFollowUpSubject(invoice.invoiceNumber, followUpNumber);

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

        await recordFollowUp({
          pidInvoice: invoice.pidInvoice,
          followUpNumber,
          subject,
          status: 'SENT',
        });
        results.sentCount += 1;
      } catch (error: any) {
        const message = error?.message || 'Unknown error';
        await recordFollowUp({
          pidInvoice: invoice.pidInvoice,
          followUpNumber,
          subject,
          status: 'FAILED',
          error: message,
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
