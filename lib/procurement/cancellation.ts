import { createHash, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimalUnits, majorAmount } from "@/lib/refunds/money";
import {
  canCancelProcurement,
  cancellationAmounts,
} from "./cancellation-policy";

type Actor = { kind: "customer" | "admin"; pidUser: string };
export class CancellationError extends Error {}

export async function cancellationQuote(
  tx: Prisma.TransactionClient,
  pidOrder: string,
  actor: Actor,
  chargeFee: boolean,
) {
  const [order] = await tx.$queryRaw<
    Array<{
      pidUser: string;
      status: string;
      cancellationLockedAt: Date | null;
      exchangeRate1: string | null;
    }>
  >`SELECT pidUser,status,cancellationLockedAt,exchangeRate1 FROM orders WHERE pidOrder=${pidOrder} FOR UPDATE`;
  if (!order || (actor.kind === "customer" && order.pidUser !== actor.pidUser))
    throw new CancellationError("Order not found.");
  if (
    !canCancelProcurement(
      order.status,
      actor.kind,
      Boolean(order.cancellationLockedAt),
    )
  )
    throw new CancellationError(
      "This order is no longer eligible for cancellation.",
    );
  const partners = await tx.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM procurement_partner_customer_orders WHERE releasedOrderId=${pidOrder}`;
  if (partners.length)
    throw new CancellationError(
      "Use the partner Order adjustments workflow for this order.",
    );
  const [settings] = await tx.$queryRaw<
    Array<{ feePercent: string }>
  >`SELECT feePercent FROM procurement_cancellation_settings WHERE id=1`;
  if (!settings)
    throw new CancellationError("Cancellation settings need to be configured.");
  const feePercent =
    actor.kind === "customer" || chargeFee ? String(settings.feePercent) : "0";
  const payments = await tx.payments.findMany({
    where: {
      pidUser: order.pidUser,
      serviceID: pidOrder,
      serviceName: "PROCUREMENT",
      paymentStatus: "PAID",
    },
  });
  const totals = new Map<string, bigint>();
  const references = new Set<string>();
  for (const payment of payments) {
    const currency = String(payment.currency || "").toUpperCase();
    if (
      !["NGN", "USD"].includes(currency) ||
      !payment.txRef ||
      references.has(payment.txRef)
    )
      throw new CancellationError(
        "The payment records need review before cancellation.",
      );
    references.add(payment.txRef);
    totals.set(
      currency,
      (totals.get(currency) || BigInt(0)) + decimalUnits(payment.amount, 2),
    );
  }
  // Reserve previous refunds regardless of whether already paid or still available.
  const prior = await tx.refund_records.findMany({
    where: { pidOrder, pidUser: order.pidUser, serviceType: "PROCUREMENT" },
  });
  for (const refund of prior) {
    const currency = String(refund.currency || "").toUpperCase();
    let gross = decimalUnits(refund.amount || "0", 2);
    if (refund.ext1 === "ORDER_ADJUSTMENT") {
      let snapshot: {
        refundBeforeFeeUsd?: number;
        refundGrossAmount?: string;
        refundCurrency?: string;
      };
      try {
        snapshot = JSON.parse(refund.ext2 || "{}");
      } catch {
        throw new CancellationError(
          "A previous refund needs review before cancellation.",
        );
      }
      if (!snapshot.refundBeforeFeeUsd)
        throw new CancellationError(
          "A previous refund needs review before cancellation.",
        );
      if (snapshot.refundGrossAmount && snapshot.refundCurrency === currency) {
        gross = decimalUnits(snapshot.refundGrossAmount, 2);
      } else if (currency === "USD") {
        gross = decimalUnits(snapshot.refundBeforeFeeUsd, 2);
      } else {
        // Older adjustments did not retain the original FX rate. Never use today's
        // order rate to reconstruct a historical refund and risk over-crediting.
        throw new CancellationError(
          "The original currency breakdown of an earlier refund needs review before cancellation.",
        );
      }
    } else if (refund.ext1 !== "SHIPPING_ADJUSTMENT") {
      throw new CancellationError(
        "This order already has a refund requiring review.",
      );
    }
    if (!totals.has(currency) || totals.get(currency)! < gross)
      throw new CancellationError(
        "The previous refunds and payments need review.",
      );
    totals.set(currency, totals.get(currency)! - gross);
  }
  const amounts = [...totals]
    .filter(([, gross]) => gross > BigInt(0))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, gross]) => {
      const { feeMinor, netMinor } = cancellationAmounts(gross, feePercent);
      if (netMinor <= BigInt(0))
        throw new CancellationError(
          "The cancellation fee leaves no refundable balance.",
        );
      return {
        currency,
        gross: majorAmount(gross),
        fee: majorAmount(feeMinor),
        net: majorAmount(netMinor),
      };
    });
  if (!amounts.length)
    throw new CancellationError(
      "No confirmed refundable payment was found for this order.",
    );
  const quote = {
    pidOrder,
    pidUser: order.pidUser,
    status: order.status,
    feePercent,
    amounts,
  };
  return {
    ...quote,
    token: createHash("sha256").update(JSON.stringify(quote)).digest("hex"),
  };
}

export async function getCancellationQuote(
  pidOrder: string,
  actor: Actor,
  chargeFee: boolean,
) {
  return prisma.$transaction((tx) =>
    cancellationQuote(tx, pidOrder, actor, chargeFee),
  );
}

export async function cancelProcurement(
  pidOrder: string,
  actor: Actor,
  chargeFee: boolean,
  token: string,
) {
  return prisma.$transaction(async (tx) => {
    // Serialize retries and cancellation against order-stage updates.
    await tx.$queryRaw`SELECT pidOrder FROM orders WHERE pidOrder=${pidOrder} FOR UPDATE`;
    const existing = await tx.refund_records.findMany({
      where: { pidOrder, ext1: "PROCUREMENT_CANCELLATION" },
    });
    if (existing.length) {
      const snapshot = JSON.parse(existing[0].ext2 || "{}");
      if (
        snapshot.actorPid === actor.pidUser &&
        snapshot.actorKind === actor.kind &&
        snapshot.quoteToken === token
      )
        return { refundIds: existing.map((r) => r.pidRefund) };
      throw new CancellationError(
        "This order has already been cancelled. Refresh its refund balance.",
      );
    }
    const quote = await cancellationQuote(tx, pidOrder, actor, chargeFee);
    if (!token || token !== quote.token)
      throw new CancellationError(
        "The order or cancellation fee changed. Review the updated amounts and confirm again.",
      );
    const claimed = await tx.orders.updateMany({
      where: { pidOrder, pidUser: quote.pidUser, status: quote.status },
      data: { status: "cancelled", updatedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new CancellationError(
        "The order changed. Refresh before trying again.",
      );
    const refundIds: string[] = [];
    for (const amount of quote.amounts) {
      const pidRefund = `CANCEL${createHash("sha256")
        .update(pidOrder + ":" + amount.currency)
        .digest("hex")
        .slice(0, 32)}`;
      const details = {
        ...amount,
        feePercent: quote.feePercent,
        actorKind: actor.kind,
        actorPid: actor.pidUser,
        quoteToken: quote.token,
      };
      await tx.refund_records.create({
        data: {
          pidRefund,
          pidUser: quote.pidUser,
          pidOrder,
          amount: amount.net,
          currency: amount.currency,
          serviceType: "PROCUREMENT",
          refundStatus: "pending",
          ext1: "PROCUREMENT_CANCELLATION",
          ext2: JSON.stringify(details),
          updatedAt: new Date(),
        },
      });
      await tx.refund_events.create({
        data: {
          id: randomUUID(),
          refundId: pidRefund,
          eventType: "CANCELLATION_CREDIT",
          actorPid: actor.pidUser,
          detailsJson: JSON.stringify(details),
        },
      });
      refundIds.push(pidRefund);
    }
    const user = await tx.users.findUnique({
      where: { pidUser: quote.pidUser },
      select: { userEmail: true },
    });
    await tx.messages.create({
      data: {
        pidMessage: randomUUID(),
        pidOrder,
        pidFrom: "hello@sureimports.com",
        pidTo: user?.userEmail,
        messageTitle: "Order cancelled — refund available",
        messageContent:
          "Your order was cancelled and the refund balance credited. Open Dashboard > Refunds to view the fee and request a payout or wallet transfer.",
        messageStatus: "unread",
      },
    });
    return { refundIds };
  });
}
