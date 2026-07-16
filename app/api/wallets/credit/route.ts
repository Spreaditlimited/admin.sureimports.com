import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import randomGenerator from '@/lib/helpers/randomGenerator';
import sendWalletCreditEmail from '@/lib/email/sendWalletCreditEmail';
import { ensureWallet, recordWalletCredit, syncLegacyWalletDebits } from '@/lib/walletLedger';

const CUSTOMER_ACCOUNTS_SERVICE_KEY = 'customer_accounts';

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export async function POST(request: Request) {
  const access = await requireAdminServiceAccess(CUSTOMER_ACCOUNTS_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  try {
    const body = await request.json();
    const pidUser = typeof body?.pidUser === 'string' ? body.pidUser.trim() : '';
    const amount = toAmount(body?.amount);
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    const externalReference = typeof body?.reference === 'string' && body.reference.trim()
      ? body.reference.trim()
      : '';

    if (!pidUser) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Customer is required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Credit amount must be greater than zero' },
        { status: 400 }
      );
    }

    if (reason.length < 5) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Please provide a clear credit reason' },
        { status: 400 }
      );
    }

    const user = await prisma.users.findUnique({
      where: { pidUser },
      select: {
        pidUser: true,
        userEmail: true,
        email: true,
        userFirstname: true,
        userLastname: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Customer not found' },
        { status: 404 }
      );
    }

    const email = user.userEmail || user.email || '';
    if (!email) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Customer email is missing' },
        { status: 400 }
      );
    }

    const payerName =
      `${user.userFirstname || ''} ${user.userLastname || ''}`.trim() ||
      'Customer';
    await syncLegacyWalletDebits(prisma, user);
    const wallet = await ensureWallet(prisma, user);
    const walletBalanceBeforeCredit = wallet.balance;

    const now = new Date();
    const pidCredit = `CRD${randomGenerator(12)}`;
    const displayReference = externalReference || `ADMCREDIT-${pidCredit}`;
    const ledgerDescription = externalReference
      ? `${reason} | Ref: ${externalReference} | Admin: ${access.admin.pidUser}`
      : `${reason} | Admin: ${access.admin.pidUser}`;

    const transaction = await recordWalletCredit(prisma, user, {
      amount,
      reference: `ADMIN_CREDIT:${pidCredit}`,
      description: ledgerDescription,
      currency: 'NGN',
      date: now,
    });

    const walletBalanceAfterCredit = walletBalanceBeforeCredit + amount;

    const emailSent = await sendWalletCreditEmail({
      userEmail: email,
      userName: payerName,
      amount,
      currency: 'NGN',
      reason,
      reference: displayReference,
      newBalance: walletBalanceAfterCredit,
      creditedAt: now.toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: emailSent
        ? 'Wallet credit recorded and customer notification sent.'
        : 'Wallet credit recorded. Customer notification could not be sent.',
      data: transaction,
      emailSent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Manual wallet credit failed:', error);
    return NextResponse.json(
      {
        statusx: 'FAILED',
        message: 'Failed to credit wallet',
        error: message,
      },
      { status: 500 }
    );
  }
}
