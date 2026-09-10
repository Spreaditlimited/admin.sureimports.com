import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');
const bankServiceTypes = ['bank-pending-saved-orders', 'bank-pending-shipping-orders'];

function ledgerPaymentId(pidBankPayment) {
  return `PAY${pidBankPayment.replace(/[^a-zA-Z0-9]/g, '').slice(0, 70)}`;
}

function title(message) {
  return String(message.messageTitle || '').trim().toUpperCase();
}

function classifyAttempt({ attempt, nextAttempt, messages, orderStatus }) {
  const shipping = attempt.serviceType === 'bank-pending-shipping-orders';
  const acceptedTitle = shipping ? 'ADMIN MESSAGE: IN-TRANSIT' : 'ADMIN MESSAGE: PENDING';
  const rejectedTitle = shipping ? 'ADMIN MESSAGE: PAY-FOR-SHIPPING' : 'ADMIN MESSAGE: SAVED';
  const start = new Date(attempt.createdAt || 0).getTime();
  const end = nextAttempt ? new Date(nextAttempt.createdAt || 0).getTime() : Number.POSITIVE_INFINITY;
  const decisiveEvent = messages.find((message) => {
    const timestamp = new Date(message.createdAt || 0).getTime();
    const messageTitle = title(message);
    return timestamp >= start && timestamp < end && (messageTitle === acceptedTitle || messageTitle === rejectedTitle);
  });

  if (decisiveEvent) return title(decisiveEvent) === acceptedTitle ? 'CONFIRMED' : 'REJECTED';
  if (nextAttempt) return 'SUPERSEDED';
  if (orderStatus === attempt.serviceType) return 'PENDING';

  const confirmedStatuses = shipping
    ? new Set(['in-transit', 'ready-for-pickup', 'completed'])
    : new Set(['pending', 'approved', 'pay-for-shipping', 'in-transit', 'ready-for-pickup', 'completed']);
  if (confirmedStatuses.has(String(orderStatus || ''))) return 'CONFIRMED';
  return orderStatus ? 'REJECTED' : 'ORPHANED';
}

function paymentData(attempt, user) {
  const shipping = attempt.serviceType === 'bank-pending-shipping-orders';
  return {
    pidPayment: ledgerPaymentId(attempt.pidBankPayment),
    pidUser: attempt.pidUser,
    payerName: attempt.depositorName || `${user?.userFirstname || ''} ${user?.userLastname || ''}`.trim() || 'Customer',
    payerEmail: user?.userEmail || null,
    txID: attempt.trxNumber || attempt.pidBankPayment,
    txRef: attempt.pidBankPayment,
    paymentStatus: 'PAID',
    paymentType: 'BANK_TRANSFER',
    currency: attempt.currency || 'NGN',
    amount: Number(attempt.amount || 0),
    serviceID: attempt.pidOrder,
    serviceName: 'PROCUREMENT',
    serviceDescription: shipping
      ? 'Confirmed manual procurement shipping payment'
      : 'Confirmed manual procurement order payment',
    bankName: attempt.pidBank,
    depositorName: attempt.depositorName,
    createdAt: attempt.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

try {
  const attempts = await prisma.bank_payment.findMany({
    where: { serviceType: { in: bankServiceTypes } },
    orderBy: [{ pidOrder: 'asc' }, { serviceType: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
  });
  const orderIds = [...new Set(attempts.map((attempt) => attempt.pidOrder).filter(Boolean))];
  const userIds = [...new Set(attempts.map((attempt) => attempt.pidUser).filter(Boolean))];
  const [orders, messages, users] = await Promise.all([
    prisma.orders.findMany({ where: { pidOrder: { in: orderIds } }, select: { pidOrder: true, status: true } }),
    prisma.messages.findMany({ where: { pidOrder: { in: orderIds } }, select: { pidOrder: true, messageTitle: true, createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.users.findMany({ where: { pidUser: { in: userIds } }, select: { pidUser: true, userFirstname: true, userLastname: true, userEmail: true } }),
  ]);
  const orderById = new Map(orders.map((order) => [order.pidOrder, order]));
  const userById = new Map(users.map((user) => [user.pidUser, user]));
  const messagesByOrder = new Map();
  for (const message of messages) {
    const list = messagesByOrder.get(message.pidOrder) || [];
    list.push(message);
    messagesByOrder.set(message.pidOrder, list);
  }
  const grouped = new Map();
  for (const attempt of attempts) {
    const key = `${attempt.pidOrder}::${attempt.serviceType}`;
    const list = grouped.get(key) || [];
    list.push(attempt);
    grouped.set(key, list);
  }

  const classified = [];
  for (const groupAttempts of grouped.values()) {
    for (let index = 0; index < groupAttempts.length; index += 1) {
      const attempt = groupAttempts[index];
      classified.push({
        attempt,
        outcome: classifyAttempt({
          attempt,
          nextAttempt: groupAttempts[index + 1] || null,
          messages: messagesByOrder.get(attempt.pidOrder) || [],
          orderStatus: orderById.get(attempt.pidOrder)?.status || null,
        }),
      });
    }
  }

  const counts = classified.reduce((result, item) => {
    result[item.outcome] = (result[item.outcome] || 0) + 1;
    return result;
  }, {});
  const confirmed = classified.filter((item) => item.outcome === 'CONFIRMED');
  const invalidConfirmed = confirmed.filter((item) => !Number.isFinite(Number(item.attempt.amount)) || Number(item.attempt.amount) <= 0);
  if (invalidConfirmed.length) throw new Error(`${invalidConfirmed.length} confirmed payment(s) have invalid amounts.`);

  if (apply) {
    const operations = [];
    for (const { attempt, outcome } of classified) {
      operations.push(prisma.bank_payment.update({
        where: { id: attempt.id },
        data: { bankStatus: outcome, status: outcome, updatedAt: new Date() },
      }));
      if (outcome === 'CONFIRMED') {
        const data = paymentData(attempt, userById.get(attempt.pidUser));
        operations.push(prisma.payments.upsert({
          where: { pidPayment: data.pidPayment },
          create: data,
          update: { ...data, createdAt: undefined },
        }));
      }
    }
    for (let index = 0; index < operations.length; index += 25) {
      await prisma.$transaction(operations.slice(index, index + 25));
    }
  }

  process.stdout.write(`${JSON.stringify({
    mode: apply ? 'APPLIED' : 'DRY_RUN',
    bankAttempts: attempts.length,
    orderStageGroups: grouped.size,
    outcomes: counts,
    paymentRowsToUpsert: confirmed.length,
    targetOrder: classified.filter((item) => item.attempt.pidOrder === 'DR1787902738984').map((item) => ({ pidBankPayment: item.attempt.pidBankPayment, outcome: item.outcome })),
  }, null, 2)}\n`);
} finally {
  await prisma.$disconnect();
}
