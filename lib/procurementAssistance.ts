import { randomInt, randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export const assistanceId = (prefix: string) => `${prefix}_${randomUUID().replaceAll('-', '')}`;
export const procurementOrderId = () => `DR${Date.now()}${randomInt(100000, 1000000)}`;
const compatibilityFields = ['destinationCountry', 'currencyType', 'shippingPlan', 'orderCategory', 'shippingPricingVersion', 'shippingMeasurementUnit', 'shippingRateCurrency'] as const;

export async function getActiveAssistance(pidCase: string, adminPid: string, capability: 'canEditOrder' | 'canManageProducts' | 'canMergeOrders') {
  const item = await prisma.procurement_assistance_cases.findFirst({
    where: { pidCase, status: 'ACTIVE', expiresAt: { gt: new Date() }, assignedAdminPidUser: adminPid, [capability]: true },
  });
  if (!item) throw new Error('This authorization is not active or is assigned to another admin.');
  return item;
}

export async function ensureCaseOrder(pidCase: string, pidOrder: string, pidUser: string) {
  const [scope, order] = await Promise.all([
    prisma.procurement_assistance_case_orders.findUnique({ where: { pidCase_pidOrder: { pidCase, pidOrder } } }),
    prisma.orders.findFirst({ where: { pidOrder, pidUser, status: 'saved', mergedIntoOrderId: null } }),
  ]);
  if (!scope || !order) throw new Error('The order is outside the authorized scope or is no longer editable.');
  return order;
}

export async function mergeAssistedOrders(input: { pidCase: string; pidUser: string; orderIds: string[]; targetOrderId: string; actorPid: string; idempotencyKey: string }) {
  const orderIds = [...new Set(input.orderIds)];
  if (orderIds.length < 2 || !orderIds.includes(input.targetOrderId)) throw new Error('Select at least two orders and an order to keep.');
  return prisma.$transaction(async (tx) => {
    const existing = await tx.procurement_order_merges.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) return existing;
    const scopes = await tx.procurement_assistance_case_orders.count({ where: { pidCase: input.pidCase, pidOrder: { in: orderIds } } });
    const orders = await tx.orders.findMany({ where: { pidOrder: { in: orderIds }, pidUser: input.pidUser, status: 'saved', mergedIntoOrderId: null }, include: { products: true } });
    if (scopes !== orderIds.length || orders.length !== orderIds.length) throw new Error('Every selected order must be saved and explicitly authorized.');
    const target = orders.find((order) => order.pidOrder === input.targetOrderId)!;
    const conflicts = orders.flatMap((order) => compatibilityFields.filter((field) => (target[field] ?? null) !== (order[field] ?? null)));
    if (conflicts.length) throw new Error(`Orders have different ${[...new Set(conflicts)].join(', ')} settings.`);
    const [payments, bankPayments] = await Promise.all([tx.payments.count({ where: { serviceID: { in: orderIds } } }), tx.bank_payment.count({ where: { pidOrder: { in: orderIds } } })]);
    if (payments || bankPayments) throw new Error('Paid orders cannot be merged.');
    const pidMerge = assistanceId('PM');
    const sources = orders.filter((order) => order.pidOrder !== input.targetOrderId);
    const movedProductCount = sources.reduce((sum, order) => sum + order.products.length, 0);
    const merge = await tx.procurement_order_merges.create({ data: { pidMerge, pidUser: input.pidUser, targetOrderId: input.targetOrderId, actorType: 'ADMIN', actorPid: input.actorPid, assistanceCaseId: input.pidCase, idempotencyKey: input.idempotencyKey, movedProductCount } });
    for (const source of sources) {
      await tx.procurement_order_merge_sources.create({ data: { pidMerge, sourceOrderId: source.pidOrder, productCount: source.products.length, snapshotJson: JSON.parse(JSON.stringify(source)) } });
      await tx.products.updateMany({ where: { pidOrder: source.pidOrder }, data: { pidOrder: input.targetOrderId, pidUser: input.pidUser, updatedAt: new Date() } });
      await tx.orders.update({ where: { pidOrder: source.pidOrder }, data: { status: 'merged', mergedIntoOrderId: input.targetOrderId, mergedAt: new Date(), updatedAt: new Date() } });
    }
    await tx.orders.update({ where: { pidOrder: input.targetOrderId }, data: { assistanceRevision: { increment: 1 }, updatedAt: new Date() } });
    return merge;
  });
}
