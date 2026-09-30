/** Vehicle-only cancellation rules. All money uses integer kobo. */
export function refundAmounts(paidMinor: number) {
  if (!Number.isSafeInteger(paidMinor) || paidMinor < 0)
    throw new Error("Invalid approved payments.");
  const feeMinor = Number(
    (BigInt(paidMinor) * BigInt(5) + BigInt(500)) / BigInt(1000),
  );
  return { grossMinor: paidMinor, feeMinor, netMinor: paidMinor - feeMinor };
}
export function validRefundCalendar(days: number, holidays: string[]) {
  return (
    Number.isInteger(days) &&
    days >= 1 &&
    days <= 60 &&
    Array.isArray(holidays) &&
    holidays.length <= 366 &&
    holidays.every(
      (d) =>
        typeof d === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        !Number.isNaN(Date.parse(d)) &&
        new Date(d).toISOString().slice(0, 10) === d,
    )
  );
}
// Lagos is UTC+1 year-round. Count from the next date, excluding weekends and configured holidays.
export function refundDeadline(
  requestedAt: Date,
  days: number,
  holidays: string[] = [],
) {
  if (
    !validRefundCalendar(days, holidays) ||
    !Number.isFinite(requestedAt.getTime())
  )
    throw new Error("Invalid refund calendar.");
  const local = new Date(requestedAt.getTime() + 3600000);
  let remaining = days;
  while (remaining > 0) {
    local.setUTCDate(local.getUTCDate() + 1);
    if (
      ![0, 6].includes(local.getUTCDay()) &&
      !holidays.includes(local.toISOString().slice(0, 10))
    )
      remaining--;
  }
  local.setUTCHours(23, 59, 59, 999);
  return new Date(local.getTime() - 3600000);
}
