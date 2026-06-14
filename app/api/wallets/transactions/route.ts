import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { syncLegacyWalletDebits } from '@/lib/walletLedger';

const CUSTOMER_ACCOUNTS_SERVICE_KEY = 'customer_accounts';

type WalletRow = {
  id: string;
  source: 'ledger';
  direction: 'credit' | 'debit';
  reference: string;
  pidUser: string | null;
  customerName: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  description: string;
  fee: number;
  createdAt: string;
};

function customerName(user: {
  userFirstname?: string | null;
  userLastname?: string | null;
  userEmail?: string | null;
  email?: string | null;
}) {
  return `${user.userFirstname || ''} ${user.userLastname || ''}`.trim() || user.userEmail || user.email || 'Unknown Customer';
}

async function syncExistingDebitRows() {
  const debitUsers = await prisma.debits.findMany({
    where: {
      paymentStatus: {
        in: ['DEBITED', 'REFUND_CREDIT'],
      },
    },
    select: {
      pidUser: true,
      email: true,
    },
  });

  const pidUsers = [...new Set(debitUsers.map((row) => row.pidUser).filter(Boolean))];
  const emails = [...new Set(debitUsers.map((row) => row.email).filter(Boolean))];
  const users = await prisma.users.findMany({
    where: {
      OR: [
        { pidUser: { in: pidUsers } },
        { userEmail: { in: emails } },
        { email: { in: emails } },
      ],
    },
    select: {
      pidUser: true,
      userEmail: true,
      email: true,
      userFirstname: true,
      userLastname: true,
    },
  });

  for (const user of users) {
    await syncLegacyWalletDebits(prisma, user);
  }
}

export async function GET(request: NextRequest) {
  const access = await requireAdminServiceAccess(CUSTOMER_ACCOUNTS_SERVICE_KEY, 'view');
  if (!access.ok) return access.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    await syncExistingDebitRows();

    const wallets = await prisma.wallet.findMany({
      include: {
        user: {
          select: {
            pidUser: true,
            userEmail: true,
            email: true,
            userFirstname: true,
            userLastname: true,
          },
        },
        transactions: {
          orderBy: {
            date: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const allRows: WalletRow[] = wallets.flatMap((wallet) =>
      wallet.transactions.map((transaction) => ({
        id: transaction.id,
        source: 'ledger' as const,
        direction: transaction.type === 'CREDIT' ? 'credit' : 'debit',
        reference: transaction.categoryId || transaction.id,
        pidUser: wallet.pidUser,
        customerName: customerName(wallet.user),
        email: String(wallet.user.userEmail || wallet.user.email || '').toLowerCase(),
        amount: transaction.amount,
        currency: wallet.currency || 'NGN',
        status: transaction.type === 'CREDIT' ? 'CREDITED' : 'DEBITED',
        channel: transaction.categoryId?.split(':')[0] || 'WALLET_LEDGER',
        description: transaction.description,
        fee: 0,
        createdAt: transaction.date.toISOString(),
      })),
    );

    const filteredRows = allRows.filter((row) => {
      if (!search) return true;
      return [
        row.reference,
        row.pidUser || '',
        row.customerName,
        row.email,
        row.description,
        row.channel,
        row.status,
      ].some((value) => value.toLowerCase().includes(search));
    });

    filteredRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const customerBalances = wallets
      .map((wallet) => {
        const credits = wallet.transactions
          .filter((transaction) => transaction.type === 'CREDIT')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const debits = wallet.transactions
          .filter((transaction) => transaction.type === 'DEBIT')
          .reduce((sum, transaction) => sum + transaction.amount, 0);
        const rawBalance = credits - debits;

        return {
          pidUser: wallet.pidUser,
          customerName: customerName(wallet.user),
          email: String(wallet.user.userEmail || wallet.user.email || '').toLowerCase(),
          currency: wallet.currency || 'NGN',
          credits,
          debits,
          rawBalance,
          balance: Math.max(rawBalance, 0),
        };
      })
      .sort((a, b) => b.balance - a.balance);

    const aggregateWalletBalance = customerBalances.reduce((sum, customer) => sum + customer.balance, 0);
    const aggregateNetWalletBalance = customerBalances.reduce((sum, customer) => sum + customer.rawBalance, 0);
    const aggregateNegativeBalances = customerBalances.reduce(
      (sum, customer) => sum + Math.min(customer.rawBalance, 0),
      0,
    );

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: filteredRows,
      customerBalances,
      aggregateWalletBalance,
      aggregateNetWalletBalance,
      aggregateNegativeBalances,
      aggregateCredits: customerBalances.reduce((sum, customer) => sum + customer.credits, 0),
      aggregateDebits: customerBalances.reduce((sum, customer) => sum + customer.debits, 0),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Wallet transactions fetch failed:', error);
    return NextResponse.json(
      {
        statusx: 'FAILED',
        message: 'Failed to fetch wallet transactions',
        error: message,
      },
      { status: 500 },
    );
  }
}
