import { Prisma, TransactionType, WalletType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type WalletDb = Prisma.TransactionClient | typeof prisma;

type WalletUser = {
  pidUser: string;
  userEmail: string | null;
  email?: string | null;
  userFirstname?: string | null;
  userLastname?: string | null;
};

const WALLET_NAME = 'Sure Imports Wallet';

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export async function ensureWallet(db: WalletDb, user: WalletUser, currency = 'NGN') {
  return db.wallet.upsert({
    where: { pidUser: user.pidUser },
    update: {
      name: WALLET_NAME,
      currency,
    },
    create: {
      name: WALLET_NAME,
      type: WalletType.MAIN,
      currency,
      balance: 0,
      pidUser: user.pidUser,
    },
  });
}

async function recordWalletTransaction(
  db: WalletDb,
  user: WalletUser,
  payload: {
    amount: number;
    type: TransactionType;
    reference: string;
    description: string;
    currency?: string;
    date?: Date;
  },
) {
  const amount = toAmount(payload.amount);
  if (amount <= 0) return null;

  const wallet = await ensureWallet(db, user, payload.currency || 'NGN');
  const existing = await db.transaction.findFirst({
    where: {
      walletId: wallet.id,
      categoryId: payload.reference,
      type: payload.type,
    },
  });

  if (existing) return existing;

  const transaction = await db.transaction.create({
    data: {
      walletId: wallet.id,
      amount,
      type: payload.type,
      description: payload.description,
      categoryId: payload.reference,
      date: payload.date || new Date(),
    },
  });

  await db.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: {
        increment: payload.type === TransactionType.CREDIT ? amount : -amount,
      },
    },
  });

  return transaction;
}

export async function recordWalletCredit(
  db: WalletDb,
  user: WalletUser,
  payload: {
    amount: number;
    reference: string;
    description: string;
    currency?: string;
    date?: Date;
  },
) {
  return recordWalletTransaction(db, user, {
    ...payload,
    type: TransactionType.CREDIT,
  });
}

export async function recordWalletDebit(
  db: WalletDb,
  user: WalletUser,
  payload: {
    amount: number;
    reference: string;
    description: string;
    currency?: string;
    date?: Date;
  },
) {
  return recordWalletTransaction(db, user, {
    ...payload,
    type: TransactionType.DEBIT,
  });
}

export async function syncLegacyWalletDebits(db: WalletDb, user: WalletUser) {
  const identifiers = [
    ...(user.userEmail ? [{ email: user.userEmail }] : []),
    ...(user.email ? [{ email: user.email }] : []),
    { pidUser: user.pidUser },
  ];

  const rows = await db.debits.findMany({
    where: {
      OR: identifiers,
      paymentStatus: {
        in: ['DEBITED', 'REFUND_CREDIT'],
      },
    },
    orderBy: { id: 'asc' },
    select: {
      pidDebit: true,
      paymentStatus: true,
      amount: true,
      currency: true,
      serviceDescription: true,
      serviceName: true,
    },
  });

  for (const row of rows) {
    const isRefundCredit = String(row.paymentStatus || '').toUpperCase() === 'REFUND_CREDIT';
    const reference = `${isRefundCredit ? 'REFUND' : 'DEBIT'}:${row.pidDebit}`;
    const description =
      row.serviceDescription ||
      row.serviceName ||
      (isRefundCredit ? 'Refund credited to wallet' : 'Wallet debit');

    if (isRefundCredit) {
      await recordWalletCredit(db, user, {
        amount: row.amount,
        reference,
        description,
        currency: row.currency || 'NGN',
      });
    } else {
      await recordWalletDebit(db, user, {
        amount: row.amount,
        reference,
        description,
        currency: row.currency || 'NGN',
      });
    }
  }
}

export async function syncPaystackDedicatedNubanCredit(
  db: WalletDb,
  user: WalletUser,
  transaction: {
    id?: number;
    reference?: string;
    amount?: number;
    currency?: string;
    gateway_response?: string;
    created_at?: string;
  },
) {
  await recordWalletCredit(db, user, {
    amount: toAmount(transaction.amount) / 100,
    reference: `PAYSTACK:${transaction.id || transaction.reference}`,
    description: transaction.gateway_response || 'Wallet funding via dedicated account',
    currency: transaction.currency || 'NGN',
    date: transaction.created_at ? new Date(transaction.created_at) : undefined,
  });
}
