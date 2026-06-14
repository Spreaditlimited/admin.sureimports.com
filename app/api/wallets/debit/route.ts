import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import randomGenerator from '@/lib/helpers/randomGenerator';
import sendWalletDebitEmail from '@/lib/email/sendWalletDebitEmail';
import { ensureWallet, recordWalletDebit, syncLegacyWalletDebits } from '@/lib/walletLedger';

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
    const reference = typeof body?.reference === 'string' && body.reference.trim()
      ? body.reference.trim()
      : `ADMDEBIT-${Date.now()}`;

    if (!pidUser) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Customer is required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Debit amount must be greater than zero' },
        { status: 400 }
      );
    }

    if (reason.length < 5) {
      return NextResponse.json(
        { statusx: 'FAILED', message: 'Please provide a clear debit reason' },
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
    const walletBalanceBeforeDebit = wallet.balance;
    if (walletBalanceBeforeDebit < amount) {
      return NextResponse.json(
        {
          statusx: 'FAILED',
          message: `Insufficient wallet balance. Current balance is ₦${walletBalanceBeforeDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}.`,
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const pidDebit = `DEB${randomGenerator(12)}`;

    const debit = await prisma.debits.create({
      data: {
        pidDebit,
        pidUser: user.pidUser,
        email,
        payerName,
        txID: reference,
        txRef: reference,
        paymentStatus: 'DEBITED',
        paymentType: 'ADMIN_WALLET_DEBIT',
        currency: 'NGN',
        amount,
        serviceID: pidDebit,
        serviceName: 'Admin Wallet Debit',
        serviceDescription: reason,
        status1: 'SUCCESS',
        debitExt1: `ADMIN:${access.admin.pidUser}`,
        debitExt2: reason,
        xStatus: 'success',
        createdAt: now,
        updatedAt: now,
      },
    });

    await recordWalletDebit(prisma, user, {
      amount,
      reference: `DEBIT:${pidDebit}`,
      description: reason,
      currency: 'NGN',
      date: now,
    });

    const walletBalanceAfterDebit = walletBalanceBeforeDebit - amount;

    const emailSent = await sendWalletDebitEmail({
      userEmail: email,
      userName: payerName,
      amount,
      currency: 'NGN',
      reason,
      reference,
      newBalance: walletBalanceAfterDebit,
      debitedAt: now.toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: emailSent
        ? 'Wallet debit recorded and customer notification sent.'
        : 'Wallet debit recorded. Customer notification could not be sent.',
      data: debit,
      emailSent,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Manual wallet debit failed:', error);
    return NextResponse.json(
      {
        statusx: 'FAILED',
        message: 'Failed to debit wallet',
        error: message,
      },
      { status: 500 }
    );
  }
}
