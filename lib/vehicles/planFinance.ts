import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { getVehiclePlan } from "./plans";
import { activationDate, moneyMinor, planAllowsPayment } from "./installments";
import { vehicleEvent, vehicleId } from "./events";
export async function verifyVehicleCredit(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    claimId: string;
    bankId: string | null;
    claimedAmount: string;
    adminId: string;
    verification: Record<string, unknown>;
  },
) {
  const {
    orderId,
    claimId,
    bankId,
    claimedAmount,
    adminId,
    verification: v,
  } = input;
  const plan = await getVehiclePlan(orderId, tx);
  if (!planAllowsPayment(plan) && plan?.status !== "CANCELLATION_REQUESTED")
    throw new Error(
      "This plan is not accepting payments. Reconcile its acceptance or cancellation first.",
    );
  if (v.bankCreditConfirmed !== true)
    throw new Error("Confirm the credit in the company bank statement.");
  const reference = String(v.bankReference || "")
    .trim()
    .toUpperCase();
  if (reference.length < 6 || reference.length > 150)
    throw new Error(
      "Enter the actual bank transaction identifier (6–150 characters).",
    );
  const creditedAt = new Date(String(v.creditedAt || ""));
  if (!Number.isFinite(creditedAt.getTime()) || creditedAt > new Date())
    throw new Error("Enter the actual bank credit date and time.");
  if (
    plan?.status !== "CANCELLATION_REQUESTED" &&
    plan?.acceptedAt &&
    creditedAt < new Date(plan.acceptedAt)
  )
    throw new Error(
      "This transfer predates plan acceptance. Contact finance to reconcile it before allocation.",
    );
  if (
    plan?.status === "ACCEPTED" &&
    plan.expiresAt &&
    creditedAt > new Date(plan.expiresAt)
  )
    throw new Error(
      "Deposit arrived after offer expiry. Reconfirm the original quotation before approving.",
    );
  const amountMinor = moneyMinor(String(v.receivedAmount || ""));
  if (amountMinor <= 0 || amountMinor !== moneyMinor(claimedAmount))
    throw new Error(
      "Actual bank credit must match the claim. Reject an incorrect claim and request a corrected submission.",
    );
  const banks = await tx.$queryRaw<
    { accountNumber: string; bankName: string }[]
  >`SELECT accountNumber,bankName FROM invoice_bank_accounts WHERE pidBankAccount=${bankId}`;
  if (!banks[0]) throw new Error("Receiving bank account not found.");
  const account = banks[0].accountNumber.replace(/\s/g, "");
  const creditKey = createHash("sha256")
    .update(`${banks[0].bankName.trim().toUpperCase()}:${account}:${reference}`)
    .digest("hex");
  const existing = await tx.$queryRaw<
    { id: string }[]
  >`SELECT id FROM vehicle_bank_credits WHERE creditKey=${creditKey} OR (bankAccountId=${bankId} AND bankReference=${reference})`;
  if (existing.length)
    throw new Error(
      "This bank credit has already been allocated to a vehicle payment.",
    );
  const other = await tx.invoice_payments.findFirst({
    where: { reference },
    select: { pidInvoicePayment: true },
  });
  if (other)
    throw new Error(
      "This bank transaction reference is already recorded on another invoice. Finance must reconcile it first.",
    );
  const id = vehicleId("BC");
  await tx.$executeRaw`INSERT INTO vehicle_bank_credits (id,claimId,orderId,bankAccountId,creditKey,bankReference,amountMinor,creditedAt,verifiedBy) VALUES (${id},${claimId},${orderId},${bankId},${creditKey},${reference},${amountMinor},${creditedAt},${adminId})`;
  return { creditedAt, reference, plan };
}
export async function applyPlanCredit(
  tx: Prisma.TransactionClient,
  orderId: string,
  totalPaidMinor: number,
  actor: string,
) {
  const plan = await getVehiclePlan(orderId, tx);
  if (!plan) return;
  if (plan.status === "CANCELLATION_REQUESTED") return;
  if (!plan.terms || !planAllowsPayment(plan))
    throw new Error("Payment plan is not active.");
  const credits = await tx.$queryRaw<
    { amountMinor: string; creditedAt: Date }[]
  >`SELECT CAST(amountMinor AS CHAR) AS amountMinor,creditedAt FROM vehicle_bank_credits c WHERE orderId=${orderId} AND NOT EXISTS (SELECT 1 FROM vehicle_credit_reversals r WHERE r.claimId=c.claimId AND r.status='CONFIRMED') ORDER BY creditedAt,id`;
  const date =
    plan.activatedAt ||
    activationDate(
      plan.terms,
      credits.map((c) => ({
        amountMinor: Number(c.amountMinor),
        creditedAt: c.creditedAt.toISOString(),
      })),
    );
  if (totalPaidMinor > plan.terms.totalMinor)
    throw new Error("Payment exceeds the accepted plan total.");
  const status =
    totalPaidMinor === plan.terms.totalMinor
      ? "COMPLETED"
      : date
        ? "ACTIVE"
        : "ACCEPTED";
  const activation = date ? new Date(date) : null;
  await tx.$executeRaw`UPDATE vehicle_payment_plans SET status=${status},activatedAt=${activation},updatedAt=NOW(3) WHERE orderId=${orderId}`;
  if (date && date !== plan.activatedAt) {
    const deadline = new Date(
      new Date(date).getTime() + plan.terms.durationDays * 86400000,
    );
    await tx.$executeRaw`UPDATE invoices i JOIN vehicle_orders o ON o.pidInvoice=i.pidInvoice SET i.dueAt=${deadline},i.updatedAt=NOW(3) WHERE o.id=${orderId}`;
  }
  if (date && !plan.activatedAt)
    await vehicleEvent(
      tx,
      orderId,
      "PLAN_ACTIVATED",
      `Your minimum deposit is confirmed. Complete payment within ${plan.terms.durationDays} days from ${new Date(date).toLocaleDateString("en-GB", { timeZone: "Africa/Lagos" })}. Procurement starts only after full approved payment.`,
      actor,
    );
  if (status === "COMPLETED")
    await vehicleEvent(
      tx,
      orderId,
      "PLAN_COMPLETED",
      "Your Pay Small Small plan is fully paid. Your order is ready for procurement confirmation.",
      actor,
    );
}
