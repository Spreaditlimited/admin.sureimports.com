import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import randomGenerator from '@/lib/helpers/randomGenerator';
import sendWalletDebitEmail from '@/lib/email/sendWalletDebitEmail';

const CUSTOMER_ACCOUNTS_SERVICE_KEY = 'customer_accounts';

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

async function fetchPaystackWalletCredits(email: string) {
  const customerResponse = await fetch(`https://api.paystack.co/customer/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  const customerData = await customerResponse.json();
  const customerId = customerData?.data?.id;
  if (!customerResponse.ok || !customerId) return 0;

  const transactionResponse = await fetch(
    `https://api.paystack.co/transaction?customer=${customerId}&perPage=1000`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY}`,
      },
      cache: 'no-store',
    }
  );
  const transactionData = await transactionResponse.json();
  const transactions = Array.isArray(transactionData?.data) ? transactionData.data : [];

  return transactions.reduce((sum: number, transaction: { channel?: string; status?: string; amount?: number }) => {
    if (
      String(transaction.channel || '').toLowerCase() === 'dedicated_nuban' &&
      String(transaction.status || '').toLowerCase() === 'success'
    ) {
      return sum + toAmount(transaction.amount) / 100;
    }
    return sum;
  }, 0);
}

async function calculateWalletBalance(pidUser: string, email: string) {
  const paystackCredits = await fetchPaystackWalletCredits(email);
  const debits = await prisma.debits.findMany({
    where: {
      OR: [{ pidUser }, { email }],
    },
    select: {
      amount: true,
      paymentStatus: true,
    },
  });

  return debits.reduce((balance, row) => {
    if (String(row.paymentStatus || '').toUpperCase() === 'REFUND_CREDIT') {
      return balance + row.amount;
    }
    if (String(row.paymentStatus || '').toUpperCase() === 'DEBITED') {
      return balance - row.amount;
    }
    return balance;
  }, paystackCredits);
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
    const walletBalanceBeforeDebit = await calculateWalletBalance(user.pidUser, email);
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
