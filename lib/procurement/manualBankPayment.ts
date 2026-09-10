import type { Prisma } from '@prisma/client';

type ManualBankOutcome = 'CONFIRMED' | 'REJECTED';

export function manualBankOutcomeForTransition(currentStatus: string, newStatus: string): ManualBankOutcome | null {
  if (currentStatus === 'bank-pending-saved-orders') {
    if (newStatus === 'pending') return 'CONFIRMED';
    if (newStatus === 'saved') return 'REJECTED';
  }
  if (currentStatus === 'bank-pending-shipping-orders') {
    if (newStatus === 'in-transit') return 'CONFIRMED';
    if (newStatus === 'pay-for-shipping') return 'REJECTED';
  }
  return null;
}

export function manualBankLedgerPaymentId(pidBankPayment: string) {
  return `PAY${pidBankPayment.replace(/[^a-zA-Z0-9]/g, '').slice(0, 70)}`;
}

export async function reconcileManualProcurementBankPayment(
  tx: Prisma.TransactionClient,
  input: {
    pidOrder: string;
    currentStatus: string;
    newStatus: string;
    pidUser: string;
    customerName: string;
    customerEmail: string | null;
  },
) {
  const outcome = manualBankOutcomeForTransition(input.currentStatus, input.newStatus);
  if (!outcome) return { handled: false, outcome: null, pidBankPayment: null };

  const attempts = await tx.bank_payment.findMany({
    where: {
      pidOrder: input.pidOrder,
      serviceType: input.currentStatus,
      bankStatus: 'PENDING',
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
  const canonical = attempts[0];
  if (!canonical) {
    throw new Error('No pending manual bank payment was found for this order.');
  }

  if (attempts.length > 1) {
    await tx.bank_payment.updateMany({
      where: { id: { in: attempts.slice(1).map((attempt) => attempt.id) } },
      data: {
        bankStatus: 'SUPERSEDED',
        status: 'SUPERSEDED',
        updatedAt: new Date(),
      },
    });
  }

  await tx.bank_payment.update({
    where: { id: canonical.id },
    data: {
      bankStatus: outcome,
      status: outcome,
      updatedAt: new Date(),
    },
  });

  if (outcome === 'CONFIRMED') {
    const amount = Number(canonical.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('The manual bank payment amount is invalid.');
    }
    const pidPayment = manualBankLedgerPaymentId(canonical.pidBankPayment);
    const serviceDescription = input.currentStatus === 'bank-pending-shipping-orders'
      ? 'Confirmed manual procurement shipping payment'
      : 'Confirmed manual procurement order payment';

    await tx.payments.upsert({
      where: { pidPayment },
      create: {
        pidPayment,
        pidUser: input.pidUser,
        payerName: canonical.depositorName || input.customerName || 'Customer',
        payerEmail: input.customerEmail,
        txID: canonical.trxNumber || canonical.pidBankPayment,
        txRef: canonical.pidBankPayment,
        paymentStatus: 'PAID',
        paymentType: 'BANK_TRANSFER',
        currency: canonical.currency || 'NGN',
        amount,
        serviceID: input.pidOrder,
        serviceName: 'PROCUREMENT',
        serviceDescription,
        bankName: canonical.pidBank,
        depositorName: canonical.depositorName,
        createdAt: canonical.createdAt || new Date(),
        updatedAt: new Date(),
      },
      update: {
        pidUser: input.pidUser,
        payerName: canonical.depositorName || input.customerName || 'Customer',
        payerEmail: input.customerEmail,
        txID: canonical.trxNumber || canonical.pidBankPayment,
        txRef: canonical.pidBankPayment,
        paymentStatus: 'PAID',
        paymentType: 'BANK_TRANSFER',
        currency: canonical.currency || 'NGN',
        amount,
        serviceID: input.pidOrder,
        serviceName: 'PROCUREMENT',
        serviceDescription,
        bankName: canonical.pidBank,
        depositorName: canonical.depositorName,
        updatedAt: new Date(),
      },
    });

    if (input.currentStatus === 'bank-pending-saved-orders') {
      const order = await tx.orders.findUnique({
        where: { pidOrder: input.pidOrder },
      });
      const products = await tx.products.findMany({
        where: { pidOrder: input.pidOrder },
      });
      const ngnPerUsd = Number(order?.exchangeRate1 || 0);
      const cnyPerUsd = Number(order?.exchangeRate2 || 0);
      const rawProductTotal = products.reduce(
        (total, product) =>
          total +
          Number(product.productPrice || 0) *
            Number(product.productQuantity || 0),
        0,
      );
      const productsTotalUsd =
        order?.currencyType === 'CNY'
          ? cnyPerUsd > 0
            ? rawProductTotal / cnyPerUsd
            : 0
          : order?.currencyType === 'NGN'
            ? ngnPerUsd > 0
              ? rawProductTotal / ngnPerUsd
              : 0
            : rawProductTotal;
      const paymentCurrency = String(canonical.currency || 'NGN').toUpperCase();
      const eligibleAmount =
        paymentCurrency === 'NGN'
          ? productsTotalUsd * ngnPerUsd
          : productsTotalUsd;

      const { recordProcurementAffiliateConversion } = await import(
        '@/lib/affiliate/commissions'
      );
      await recordProcurementAffiliateConversion(tx, {
        pidUser: input.pidUser,
        pidOrder: input.pidOrder,
        paymentReference: canonical.pidBankPayment,
        paymentCurrency,
        grossAmount: amount,
        eligibleAmount,
      });
    }
  }

  return { handled: true, outcome, pidBankPayment: canonical.pidBankPayment };
}
