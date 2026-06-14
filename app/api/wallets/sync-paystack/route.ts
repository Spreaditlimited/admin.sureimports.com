import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminServiceAccess } from '@/app/api/_lib/adminAccess';
import { syncPaystackDedicatedNubanCredit } from '@/lib/walletLedger';

const CUSTOMER_ACCOUNTS_SERVICE_KEY = 'customer_accounts';

type PaystackTransaction = {
  id?: number;
  reference?: string;
  amount?: number;
  currency?: string;
  status?: string;
  channel?: string;
  gateway_response?: string;
  created_at?: string;
  customer?: {
    email?: string;
  };
};

export async function POST(request: NextRequest) {
  const access = await requireAdminServiceAccess(CUSTOMER_ACCOUNTS_SERVICE_KEY, 'edit');
  if (!access.ok) return access.response;

  try {
    const searchParams = request.nextUrl.searchParams;
    const maxPages = Math.max(1, Number(searchParams.get('maxPages') || 100));
    const perPage = Math.min(1000, Math.max(50, Number(searchParams.get('perPage') || 1000)));

    const users = await prisma.users.findMany({
      select: {
        pidUser: true,
        userEmail: true,
        email: true,
        userFirstname: true,
        userLastname: true,
      },
    });
    const usersByEmail = new Map(
      users.flatMap((user) =>
        [user.userEmail, user.email]
          .filter(Boolean)
          .map((email) => [String(email).toLowerCase(), user] as const),
      ),
    );

    let page = 1;
    let scanned = 0;
    let walletCredits = 0;
    let ingested = 0;
    let skippedWithoutUser = 0;

    while (page <= maxPages) {
      const response = await fetch(
        `https://api.paystack.co/transaction?perPage=${perPage}&page=${page}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY}`,
          },
          cache: 'no-store',
        },
      );
      const data = await response.json();
      if (!response.ok) {
        return NextResponse.json(
          {
            statusx: 'FAILED',
            message: data?.message || 'Paystack transaction sync failed',
          },
          { status: 502 },
        );
      }

      const transactions: PaystackTransaction[] = Array.isArray(data?.data) ? data.data : [];
      if (transactions.length === 0) break;

      scanned += transactions.length;
      const dedicatedCredits = transactions.filter(
        (transaction) =>
          String(transaction.channel || '').toLowerCase() === 'dedicated_nuban' &&
          String(transaction.status || '').toLowerCase() === 'success',
      );

      walletCredits += dedicatedCredits.length;

      for (const transaction of dedicatedCredits) {
        const email = String(transaction.customer?.email || '').toLowerCase();
        const user = usersByEmail.get(email);
        if (!user) {
          skippedWithoutUser += 1;
          continue;
        }

        await syncPaystackDedicatedNubanCredit(prisma, user, transaction);
        ingested += 1;
      }

      if (transactions.length < perPage) break;
      page += 1;
    }

    return NextResponse.json({
      statusx: 'SUCCESS',
      message: 'Paystack wallet credits synced into the local wallet ledger.',
      scanned,
      walletCredits,
      ingested,
      skippedWithoutUser,
      pagesScanned: page,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Paystack wallet sync failed:', error);
    return NextResponse.json(
      {
        statusx: 'FAILED',
        message: 'Paystack wallet sync failed',
        error: message,
      },
      { status: 500 },
    );
  }
}
