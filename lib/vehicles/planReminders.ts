import { prisma } from "@/lib/prisma";
import { getVehiclePlan } from "./plans";
import { moneyMinor, planSchedule } from "./installments";
import { vehicleEvent } from "./events";
export async function queueVehiclePlanReminders() {
  // Rotate active plans in bounded batches to leave time for notification delivery.
  let rows: { orderId: string }[];
  try {
    rows = await prisma.$queryRaw<
      { orderId: string }[]
    >`SELECT orderId FROM vehicle_payment_plans WHERE status='ACTIVE' ORDER BY updatedAt LIMIT 8`;
  } catch (e) {
    const x = e as { code?: string; meta?: { code?: string } };
    if (x.code === "P2021" || (x.code === "P2010" && x.meta?.code === "1146"))
      return;
    throw e;
  }
  for (const row of rows)
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehicle_orders WHERE id=${row.orderId} FOR UPDATE`;
        const p = await getVehiclePlan(row.orderId, tx);
        if (!p?.terms || p.status !== "ACTIVE") return;
        const order = await tx.vehicle_orders.findUnique({
          where: { id: row.orderId },
        });
        if (!order?.pidInvoice) return;
        const invoice = await tx.invoices.findUnique({
          where: { pidInvoice: order.pidInvoice },
        });
        if (!invoice || invoice.status === "CANCELLED") return;
        const paid = moneyMinor(String(invoice.amountPaid));
        const next = planSchedule(p.terms, p.activatedAt, paid).find(
          (r) => !r.paid && r.dueAt,
        );
        await tx.$executeRaw`UPDATE vehicle_payment_plans SET updatedAt=NOW(3) WHERE orderId=${row.orderId}`;
        if (!next?.dueAt) return;
        const pending = await tx.invoice_payment_claims.aggregate({
          where: {
            pidInvoice: order.pidInvoice,
            status: "PENDING_CONFIRMATION",
          },
          _sum: { claimedAmount: true },
        });
        if (
          paid + moneyMinor(String(pending._sum.claimedAmount || 0)) >=
          next.cumulativeMinor
        )
          return;
        const now = Date.now(),
          due = new Date(next.dueAt).getTime(),
          days = Math.ceil((due - now) / 86400000);
        // Before due, due, and at most one overdue reminder per week.
        const bucket =
          days > 0
            ? days <= 3
              ? "soon"
              : null
            : days === 0
              ? "due"
              : `late-${Math.floor(-days / 7)}`;
        if (bucket) {
          const key = `${row.orderId}:${next.dueAt}:${bucket}`;
          const inserted =
            await tx.$executeRaw`INSERT IGNORE INTO vehicle_plan_reminders (reminderKey,orderId) VALUES (${key},${row.orderId})`;
          if (inserted)
            await vehicleEvent(
              tx,
              row.orderId,
              "PLAN_REMINDER",
              `Pay Small Small: NGN ${((next.cumulativeMinor - paid) / 100).toLocaleString("en-NG")} ${days < 0 ? "is overdue" : "is due"} by ${new Date(next.dueAt).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" })}. Check your dashboard for pending bank confirmations before making another transfer.`,
              "system",
            );
        }
        await tx.$executeRaw`UPDATE vehicle_payment_plans SET updatedAt=NOW(3) WHERE orderId=${row.orderId}`;
      },
      { timeout: 30000 },
    );
}
