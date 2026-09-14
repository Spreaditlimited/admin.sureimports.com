import 'server-only';
import { prisma } from '@/lib/prisma';
import { decimalUnits } from './money';

/** Records an independently completed bank transfer; never initiates a transfer. */
export async function confirmForeignBankRefund(input: {
  refundId: string;
  reference: string;
  adminId: string;
  confirmedAmount: string;
  confirmedCurrency: string;
  destinationVerified: boolean;
}) {
  if (
    !input.destinationVerified ||
    input.reference.length < 6 ||
    input.reference.length > 191
  )
    throw new Error(
      'Verify the account owner and enter the actual bank transfer reference.',
    );
  return prisma.$transaction(async (tx) => {
    const [refund] = await tx.$queryRaw<
      {
        pidUser: string;
        amount: string;
        currency: string;
        refundStatus: string;
      }[]
    >`SELECT pidUser,amount,currency,refundStatus FROM refund_records WHERE pidRefund=${input.refundId} FOR UPDATE`;
    const [settlement] = await tx.$queryRaw<
      {
        sourceAmount: string;
        sourceCurrency: string;
        settlementAmount: string;
        settlementCurrency: string;
        method: string;
        status: string;
      }[]
    >`SELECT sourceAmount,sourceCurrency,settlementAmount,settlementCurrency,method,status FROM refund_settlements WHERE refundId=${input.refundId} FOR UPDATE`;
    if (
      !refund ||
      !settlement ||
      !['USD', 'NGN'].includes(refund.currency) ||
      refund.refundStatus !== 'requested' ||
      settlement.status !== 'REQUESTED' ||
      settlement.method !== 'BANK'
    )
      throw new Error(
        'This refund is not awaiting bank settlement. Refresh its status.',
      );
    if (
      decimalUnits(String(refund.amount), 2) !==
        decimalUnits(String(settlement.sourceAmount), 2) ||
      settlement.sourceCurrency !== refund.currency
    )
      throw new Error(
        'The original refund amount changed. Settlement requires review.',
      );
    if (
      input.confirmedCurrency !== settlement.settlementCurrency ||
      decimalUnits(input.confirmedAmount, 2) !==
        decimalUnits(String(settlement.settlementAmount), 2)
    )
      throw new Error(
        'The transferred amount and currency must match the locked settlement.',
      );
    await tx.$executeRaw`UPDATE refund_settlements SET status='SETTLED',reference=${input.reference},approvedBy=${input.adminId},settledAt=NOW(3),updatedAt=NOW(3) WHERE refundId=${input.refundId}`;
    await tx.refund_records.update({
      where: { pidRefund: input.refundId },
      data: {
        refundStatus: 'refunded',
        xStatus: 'REFUNDED',
        updatedAt: new Date(),
      },
    });
    return {
      amount: String(settlement.settlementAmount),
      currency: settlement.settlementCurrency,
    };
  });
}
