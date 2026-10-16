export const POST_APPROVED_STAGES = [
  "pay-for-shipping",
  "bank-pending-shipping-orders",
  "in-transit",
  "ready-for-pickup",
  "completed",
  "revert_to_approved",
];

export function canCancelProcurement(
  status: string,
  actor: "customer" | "admin",
  locked: boolean,
) {
  return (
    !locked &&
    (actor === "customer"
      ? status === "pending"
      : ["pending", "approved", "on-hold"].includes(status))
  );
}

export function cancellationAmounts(grossMinor: bigint, percentage: string) {
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(percentage))
    throw new Error(
      "Enter a percentage between 0 and 100 with at most two decimal places.",
    );
  const [whole, fraction = ""] = percentage.split(".");
  const basisPoints =
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  if (basisPoints > BigInt(10000) || grossMinor <= BigInt(0))
    throw new Error("Invalid cancellation amount or fee.");
  const feeMinor = (grossMinor * basisPoints + BigInt(5000)) / BigInt(10000);
  return { feeMinor, netMinor: grossMinor - feeMinor };
}
