import { prisma } from "@/lib/prisma";
import { vehicleAdmin } from "@/lib/vehicles/access";
import { sameOrigin, inputText } from "@/lib/vehicles/http";
import { getVehiclePlan } from "@/lib/vehicles/plans";
import { moneyMinor, moneyDecimal } from "@/lib/vehicles/installments";
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
    const claimId = inputText(body.claimId, "payment claim", 191);
    await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM vehicle_orders WHERE id=${id} FOR UPDATE`;
        const order = await tx.vehicle_orders.findUniqueOrThrow({
            where: { id },
          }),
          plan = await getVehiclePlan(id, tx);
        if (!plan?.terms || !order.pidInvoice)
          throw new Error("A quoted payment plan is required.");
        await tx.$queryRaw`SELECT id FROM invoices WHERE pidInvoice=${order.pidInvoice} FOR UPDATE`;
        const claim = await tx.invoice_payment_claims.findUniqueOrThrow({
          where: { pidClaim: claimId },
        });
        if (
          claim.pidInvoice !== order.pidInvoice ||
          claim.status !== "APPROVED" ||
          !claim.approvedInvoicePaymentPid
        )
          throw new Error("Choose an approved payment on this order.");
        const credit = await tx.$queryRaw<
          { amountMinor: string }[]
        >`SELECT CAST(amountMinor AS CHAR) AS amountMinor FROM vehicle_bank_credits WHERE claimId=${claimId} AND orderId=${id}`;
        if (!credit[0]) throw new Error("Verified bank credit not found.");
        if (body.action === "request") {
          if (!["ACCEPTED", "ACTIVE", "COMPLETED"].includes(plan.status))
            throw new Error(
              "Resolve the existing finance review before reversing another credit.",
            );
          const reason = inputText(body.reason, "bank reversal reason", 2000);
          await tx.$executeRaw`INSERT INTO vehicle_credit_reversals (claimId,orderId,reason,proposedBy) VALUES (${claimId},${id},${reason},${admin.pidUser})`;
          await tx.$executeRaw`UPDATE vehicle_payment_plans SET previousStatus=status,status='PAYMENT_REVIEW',updatedAt=NOW(3) WHERE orderId=${id}`;
          await vehicleEvent(
            tx,
            id,
            "PLAN_PAYMENT_REVIEW",
            "Finance is reviewing a bank credit. New payments and further procurement or fulfilment are paused until reconciliation is complete.",
            admin.pidUser,
          );
        } else if (body.action === "confirm") {
          const rows = await tx.$queryRaw<
            { status: string; proposedBy: string; reason: string }[]
          >`SELECT status,proposedBy,reason FROM vehicle_credit_reversals WHERE claimId=${claimId} AND orderId=${id}`;
          const review = rows[0];
          if (review?.status === "CONFIRMED") return;
          if (
            plan.status !== "PAYMENT_REVIEW" ||
            review?.status !== "REQUESTED" ||
            review.proposedBy === admin.pidUser
          )
            throw new Error(
              "A different finance reviewer must confirm this bank reversal.",
            );
          if (body.bankReversalConfirmed !== true)
            throw new Error(
              "Independently confirm the reversal on the bank statement.",
            );
          const ref = inputText(
            body.reference,
            "bank reversal reference",
            191,
          ).toUpperCase();
          if (ref.length < 6)
            throw new Error("Enter the actual bank reversal reference.");
          const invoice = await tx.invoices.findUniqueOrThrow({
            where: { pidInvoice: order.pidInvoice },
          });
          const reversedMinor = Number(credit[0].amountMinor),
            paid = moneyMinor(String(invoice.amountPaid)) - reversedMinor;
          if (paid < 0)
            throw new Error(
              "This reversal exceeds the recorded balance. Reconcile the ledger first.",
            );
          const balance = moneyMinor(String(invoice.grandTotal)) - paid;
          await tx.invoice_payments.create({
            data: {
              pidInvoicePayment: vehicleId("IVR"),
              pidInvoice: invoice.pidInvoice,
              pidUser: order.pidUser,
              amount: `-${moneyDecimal(reversedMinor)}`,
              currency: "NGN",
              paymentMethod: "BANK_REVERSAL",
              reference: ref,
              note: `Reversal of ${claim.approvedInvoicePaymentPid}: ${review.reason}`,
              paidAt: new Date(),
              recordedByPidUser: admin.pidUser,
            },
          });
          await tx.invoices.update({
            where: { pidInvoice: invoice.pidInvoice },
            data: {
              amountPaid: moneyDecimal(paid),
              balanceDue: moneyDecimal(balance),
              status: paid === 0 ? "ISSUED" : "PARTIALLY_PAID",
              paidAt: null,
              updatedByPidUser: admin.pidUser,
            },
          });
          await tx.payments.updateMany({
            where: { txID: claim.approvedInvoicePaymentPid },
            data: { paymentStatus: "REVERSED" },
          });
          await tx.$executeRaw`UPDATE vehicle_credit_reversals SET status='CONFIRMED',confirmedBy=${admin.pidUser},bankReference=${ref},confirmedAt=NOW(3) WHERE claimId=${claimId}`;
          const status = plan.activatedAt ? "ACTIVE" : "ACCEPTED";
          await tx.$executeRaw`UPDATE vehicle_payment_plans SET status=${status},updatedAt=NOW(3) WHERE orderId=${id}`;
          if (order.status === "ORDER_CONFIRMED")
            await tx.vehicle_orders.update({
              where: { id },
              data: { status: "QUOTED" },
            });
          await tx.invoice_audit_logs.create({
            data: {
              pidAuditLog: vehicleId("IA"),
              pidInvoice: invoice.pidInvoice,
              pidUser: admin.pidUser,
              action: "VEHICLE_BANK_CREDIT_REVERSED",
              metadata: JSON.stringify({
                claimId,
                reference: ref,
                reversedMinor,
                proposedBy: review.proposedBy,
                reason: review.reason,
              }),
            },
          });
          await vehicleEvent(
            tx,
            id,
            "PLAN_PAYMENT_REVERSED",
            `Bank credit of NGN ${(reversedMinor / 100).toLocaleString("en-NG")} was reversed. Your outstanding balance is now NGN ${(balance / 100).toLocaleString("en-NG")}. Original receipts are retained in your history. ${review.reason}`,
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
          ? "Unable to reverse this payment. Check for an existing reversal and retry."
          : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
