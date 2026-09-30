import { verifiedProfileBank } from "@/lib/banking/profile";
import { refundAmounts } from "@/lib/vehicles/refunds";
import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
import { sameOrigin, inputText } from "@/lib/vehicles/http";
import { getVehiclePlan } from "@/lib/vehicles/plans";
import { moneyMinor } from "@/lib/vehicles/installments";
import { vehicleEvent, vehicleId } from "@/lib/vehicles/events";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await vehicleAdmin(true, true);
  if (!admin)
    return Response.json(
      { message: "Finance permission required." },
      { status: 403 },
    );
  try {
    sameOrigin(request);
    const { id } = await params,
      body = await request.json();
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehicle_orders WHERE id=${id} FOR UPDATE`;
        const order = await tx.vehicle_orders.findUniqueOrThrow({
            where: { id },
          }),
          plan = await getVehiclePlan(id, tx);
        if (
          !plan ||
          !["CANCELLATION_REQUESTED", "REFUND_PENDING"].includes(plan.status)
        )
          throw new Error("Customer cancellation request required.");
        if (!["ENQUIRY", "QUOTED", "ORDER_CONFIRMED"].includes(order.status))
          throw new Error(
            "Procurement has started; supplier cancellation must be reviewed separately.",
          );
        if (order.pidInvoice)
          await tx.$queryRaw`SELECT id FROM invoices WHERE pidInvoice=${order.pidInvoice} FOR UPDATE`;
        const invoice = order.pidInvoice
          ? await tx.invoices.findUniqueOrThrow({
              where: { pidInvoice: order.pidInvoice },
            })
          : null;
        const pending = order.pidInvoice
          ? await tx.invoice_payment_claims.count({
              where: {
                pidInvoice: order.pidInvoice,
                status: "PENDING_CONFIRMATION",
              },
            })
          : 0;
        if (pending)
          throw new Error(
            "Reconcile all pending claims before closing the plan.",
          );
        const paidMinor = invoice ? moneyMinor(String(invoice.amountPaid)) : 0;
        if (body.action === "propose_refund") {
          if (plan.status !== "CANCELLATION_REQUESTED")
            throw new Error("A refund has already been proposed.");
          const reason = inputText(body.reason, "reconciliation notes", 2000);
          if (paidMinor === 0) {
            await tx.$executeRaw`UPDATE vehicle_payment_plans SET status='CANCELLED',updatedAt=NOW(3) WHERE orderId=${id}`;
            if (invoice)
              await tx.invoices.update({
                where: { pidInvoice: invoice.pidInvoice },
                data: {
                  status: "CANCELLED",
                  balanceDue: 0,
                  updatedByPidUser: admin.pidUser,
                },
              });
            await tx.vehicle_orders.update({
              where: { id },
              data: { status: "CANCELLED" },
            });
            await vehicleEvent(
              tx,
              id,
              "PLAN_CANCELLED",
              `Your unpaid payment plan has been cancelled. ${reason}`,
              admin.pidUser,
            );
            return;
          }
          if (!plan.refundDueAt || !plan.cancellationRequestedAt)
            throw new Error(
              "This older cancellation needs its original request date reviewed before settlement.",
            );
          const destination = await verifiedProfileBank(tx, order.pidUser);
          const account = destination.display;
          const { feeMinor, netMinor } = refundAmounts(paidMinor);
          await tx.$executeRaw`UPDATE vehicle_payment_plans SET status='REFUND_PENDING',refundGrossMinor=${paidMinor},refundFeeMinor=${feeMinor},refundMinor=${netMinor},refundAccount=${account},refundBankFingerprint=${destination.fingerprint},refundProposedBy=${admin.pidUser},updatedAt=NOW(3) WHERE orderId=${id}`;
          await vehicleEvent(
            tx,
            id,
            "PLAN_REFUND_PENDING",
            `A refund of NGN ${(netMinor / 100).toLocaleString("en-NG")} has been proposed after a 0.5% deduction of NGN ${(feeMinor / 100).toLocaleString("en-NG")}. The deadline remains ${new Date(plan.refundDueAt).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" })}. Payment remains pending until finance confirms the outgoing bank transfer. ${reason}`,
            admin.pidUser,
          );
        } else if (body.action === "confirm_refund") {
          if (
            plan.status !== "REFUND_PENDING" ||
            !plan.refundProposedBy ||
            plan.refundProposedBy === admin.pidUser
          )
            throw new Error(
              "A different authorised finance reviewer must confirm the refund.",
            );
          const destination = await verifiedProfileBank(tx, order.pidUser);
          if (
            plan.refundBankFingerprint !== destination.fingerprint ||
            plan.refundAccount !== destination.display
          )
            throw new Error(
              "The profile bank account changed. Do not transfer; finance must reconcile the refund destination.",
            );
          const { feeMinor, netMinor } = refundAmounts(paidMinor);
          if (
            Number(plan.refundGrossMinor) !== paidMinor ||
            Number(plan.refundFeeMinor) !== feeMinor ||
            Number(plan.refundMinor) !== netMinor ||
            moneyMinor(String(body.amount || "")) !== netMinor ||
            body.bankTransferConfirmed !== true
          )
            throw new Error(
              "Confirm the actual outgoing transfer for the full approved refund amount.",
            );
          const reference = inputText(
            body.reference,
            "outgoing bank reference",
            191,
          ).toUpperCase();
          if (reference.length < 6)
            throw new Error(
              "Use the actual outgoing bank transaction reference.",
            );
          await tx.$executeRaw`UPDATE vehicle_payment_plans SET status='REFUNDED',refundReference=${reference},refundedBy=${admin.pidUser},refundedAt=NOW(3),updatedAt=NOW(3) WHERE orderId=${id}`;
          if (invoice) {
            await tx.invoices.update({
              where: { pidInvoice: invoice.pidInvoice },
              data: {
                status: "CANCELLED",
                balanceDue: 0,
                updatedByPidUser: admin.pidUser,
              },
            });
            await tx.invoice_audit_logs.create({
              data: {
                pidAuditLog: vehicleId("IA"),
                pidInvoice: invoice.pidInvoice,
                pidUser: admin.pidUser,
                action: "VEHICLE_PLAN_REFUNDED",
                metadata: JSON.stringify({
                  reference,
                  refundMinor: netMinor,
                  grossMinor: paidMinor,
                  cancellationFeeMinor: feeMinor,
                  dueAt: plan.refundDueAt,
                  proposedBy: plan.refundProposedBy,
                  refundAccount: plan.refundAccount,
                }),
              },
            });
          }
          await tx.vehicle_orders.update({
            where: { id },
            data: { status: "CANCELLED" },
          });
          await vehicleEvent(
            tx,
            id,
            "PLAN_REFUNDED",
            `Your refund of NGN ${(netMinor / 100).toLocaleString("en-NG")} has been transferred. Bank reference: ${reference}. Your payment plan is closed.`,
            admin.pidUser,
          );
        } else throw new Error("Unsupported action.");
      },
      { timeout: 30000 },
    );
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      {
        message: (e as { code?: string }).code
          ? "Unable to reconcile this plan. Check for a duplicate reference and retry."
          : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
