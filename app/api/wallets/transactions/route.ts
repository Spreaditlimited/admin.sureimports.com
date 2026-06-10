import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';

const CUSTOMER_ACCOUNTS_SERVICE_KEY = 'customer_accounts';

type PaystackTransaction = {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel: string;
  gateway_response?: string;
  fees?: number;
  created_at: string;
  customer?: {
    email?: string;
    first_name?: string | null;
    last_name?: string | null;
  };
};

type WalletRow = {
  id: string;
  source: 'paystack' | 'ledger';
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

type DebitLedgerRow = {
  id: number;
  pidDebit: string;
  pidUser: string;
  email: string;
  payerName: string;
  txID: string;
  txRef: string;
  paymentStatus: string | null;
  paymentType: string | null;
  currency: string | null;
  amount: number;
  serviceID: string | null;
  serviceName: string | null;
  serviceDescription: string | null;
  status1: string | null;
  status2: string | null;
  debitExt1: string | null;
  debitExt2: string | null;
  xStatus: string | null;
  createdAtString: string | null;
};

function toNumber(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET(request: NextRequest) {
  const access = await requireAdminServiceAccess(CUSTOMER_ACCOUNTS_SERVICE_KEY, 'view');
  if (!access.ok) return access.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const users = await prisma.users.findMany({
      select: {
        pidUser: true,
        userEmail: true,
        email: true,
        userFirstname: true,
        userLastname: true,
        userPhone: true,
      },
    });

    const usersByEmail = new Map(
      users
        .flatMap((user) => [user.userEmail, user.email].filter(Boolean).map((email) => [String(email).toLowerCase(), user] as const))
    );
    const usersByPid = new Map(users.map((user) => [user.pidUser, user]));

    const paystackResponse = await fetch('https://api.paystack.co/transaction?perPage=1000', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY}`,
      },
      cache: 'no-store',
    });

    const paystackData = await paystackResponse.json();
    const paystackTransactions: PaystackTransaction[] = Array.isArray(paystackData?.data)
      ? paystackData.data
      : [];

    const creditRows: WalletRow[] = paystackTransactions
      .filter((transaction) => String(transaction.channel).toLowerCase() === 'dedicated_nuban')
      .map((transaction) => {
        const email = String(transaction.customer?.email || '').toLowerCase();
        const user = usersByEmail.get(email);
        const customerName =
          `${user?.userFirstname || transaction.customer?.first_name || ''} ${user?.userLastname || transaction.customer?.last_name || ''}`.trim() ||
          email ||
          'Unknown Customer';

        return {
          id: `paystack-${transaction.id}`,
          source: 'paystack',
          direction: 'credit',
          reference: transaction.reference,
          pidUser: user?.pidUser || null,
          customerName,
          email,
          amount: toNumber(transaction.amount) / 100,
          currency: transaction.currency || 'NGN',
          status: transaction.status,
          channel: transaction.channel,
          description: transaction.gateway_response || 'Wallet funding via dedicated account',
          fee: toNumber(transaction.fees) / 100,
          createdAt: transaction.created_at,
        };
      });

    const debitRecords = await prisma.$queryRaw<DebitLedgerRow[]>`
      SELECT
        id,
        pidDebit,
        pidUser,
        email,
        payerName,
        txID,
        txRef,
        paymentStatus,
        paymentType,
        currency,
        amount,
        serviceID,
        serviceName,
        serviceDescription,
        status1,
        status2,
        debitExt1,
        debitExt2,
        xStatus,
        DATE_FORMAT(NULLIF(createdAt, '0000-00-00 00:00:00'), '%Y-%m-%dT%H:%i:%s.000Z') AS createdAtString
      FROM debits
      ORDER BY id DESC
    `;

    const ledgerRows: WalletRow[] = debitRecords.map((debit) => {
      const user = usersByPid.get(debit.pidUser) || usersByEmail.get(String(debit.email || '').toLowerCase());
      const isRefundCredit = String(debit.paymentStatus || '').toUpperCase() === 'REFUND_CREDIT';
      const customerName =
        `${user?.userFirstname || ''} ${user?.userLastname || ''}`.trim() ||
        debit.payerName ||
        debit.email ||
        'Unknown Customer';

      return {
        id: `ledger-${debit.pidDebit}`,
        source: 'ledger',
        direction: isRefundCredit ? 'credit' : 'debit',
        reference: debit.txRef || debit.pidDebit,
        pidUser: debit.pidUser,
        customerName,
        email: String(debit.email || user?.userEmail || '').toLowerCase(),
        amount: debit.amount,
        currency: debit.currency || 'NGN',
        status: debit.paymentStatus || 'DEBITED',
        channel: debit.paymentType || 'WALLET_LEDGER',
        description: debit.serviceDescription || debit.serviceName || 'Wallet ledger transaction',
        fee: 0,
        createdAt: debit.createdAtString || new Date(0).toISOString(),
      };
    });

    const allRows = [...creditRows, ...ledgerRows].filter((row) => {
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

    allRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const balancesByCustomer = new Map<string, {
      pidUser: string | null;
      customerName: string;
      email: string;
      currency: string;
      credits: number;
      debits: number;
      rawBalance: number;
      balance: number;
    }>();

    for (const row of [...creditRows, ...ledgerRows]) {
      if (row.status.toLowerCase() !== 'success' && row.source === 'paystack') continue;
      const key = row.email || row.pidUser || row.customerName;
      const current = balancesByCustomer.get(key) || {
        pidUser: row.pidUser,
        customerName: row.customerName,
        email: row.email,
        currency: row.currency || 'NGN',
        credits: 0,
        debits: 0,
        rawBalance: 0,
        balance: 0,
      };

      if (row.direction === 'credit') current.credits += row.amount;
      if (row.direction === 'debit') current.debits += row.amount;
      current.rawBalance = current.credits - current.debits;
      current.balance = Math.max(current.rawBalance, 0);
      balancesByCustomer.set(key, current);
    }

    const customerBalances = [...balancesByCustomer.values()].sort((a, b) => b.balance - a.balance);
    const aggregateWalletBalance = customerBalances.reduce((sum, customer) => sum + customer.balance, 0);
    const aggregateNetWalletBalance = customerBalances.reduce((sum, customer) => sum + customer.rawBalance, 0);
    const aggregateNegativeBalances = customerBalances.reduce(
      (sum, customer) => sum + Math.min(customer.rawBalance, 0),
      0
    );

    return NextResponse.json({
      statusx: 'SUCCESS',
      data: allRows,
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
      { status: 500 }
    );
  }
}
