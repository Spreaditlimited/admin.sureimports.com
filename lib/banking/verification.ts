import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export function bankFingerprint(bank: {
  bank_code: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_transfer_code: string;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        bank.bank_code.trim(),
        bank.bank_account_number.trim(),
        bank.bank_account_name.trim().toUpperCase(),
        bank.bank_transfer_code.trim(),
      ]),
    )
    .digest("hex");
}
export function codeDigest(pidUser: string, nonce: string, code: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Bank verification is unavailable.");
  return createHmac("sha256", secret)
    .update(`${pidUser}:${nonce}:${code}`)
    .digest("hex");
}
export type BankChallenge = {
  purpose: "bank_details_update";
  version: 2;
  nonce: string;
  hash: string;
  issuedAt: number;
  expiresAt: number;
  attempts: number;
  windowAt: number;
  sends: number;
  bankCode: string;
  accountNumber: string;
};
export function readChallenge(value: string | null): BankChallenge | null {
  try {
    const c = JSON.parse(value || "null");
    return c?.version === 2 &&
      c.purpose === "bank_details_update" &&
      /^[a-f0-9]{64}$/.test(c.hash) &&
      typeof c.nonce === "string" &&
      Number.isFinite(c.issuedAt) &&
      Number.isFinite(c.expiresAt) &&
      Number.isInteger(c.attempts) &&
      c.attempts >= 0 &&
      Number.isFinite(c.windowAt) &&
      Number.isInteger(c.sends)
      ? c
      : null;
  } catch {
    return null;
  }
}
export function challengeMatches(
  c: BankChallenge,
  pid: string,
  code: string,
  bankCode: string,
  accountNumber: string,
  now = Date.now(),
) {
  return (
    c.expiresAt > now &&
    c.issuedAt <= now &&
    c.attempts < 5 &&
    c.bankCode === bankCode &&
    c.accountNumber === accountNumber &&
    /^\d{6}$/.test(code) &&
    timingSafeEqual(
      Buffer.from(c.hash, "hex"),
      Buffer.from(codeDigest(pid, c.nonce, code), "hex"),
    )
  );
}
export async function validateBank(bankCode: string, accountNumber: string) {
  const key = process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY;
  if (!key)
    throw new Error("Bank validation is unavailable. Please try later.");
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const r = await fetch(
    `https://api.paystack.co/bank/resolve?${new URLSearchParams({ account_number: accountNumber, bank_code: bankCode })}`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(12000) },
  );
  const resolved = await r.json();
  if (
    !r.ok ||
    resolved.status !== true ||
    resolved.data?.account_number !== accountNumber ||
    !resolved.data?.account_name?.trim()
  )
    throw new Error(
      "Paystack could not validate this account. Your bank details have not changed.",
    );
  const name = resolved.data.account_name.trim();
  const recipient = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const result = await recipient.json(),
    d = result.data;
  if (
    !recipient.ok ||
    result.status !== true ||
    !d?.recipient_code?.startsWith("RCP_") ||
    d.currency !== "NGN" ||
    d.type !== "nuban" ||
    d.active === false ||
    d.details?.account_number !== accountNumber ||
    d.details?.bank_code !== bankCode ||
    !d.details?.bank_name
  )
    throw new Error(
      "Paystack could not confirm the bank recipient. Your bank details have not changed.",
    );
  return {
    bank_name: String(d.details.bank_name),
    bank_code: bankCode,
    bank_account_number: accountNumber,
    bank_account_name: name,
    bank_transfer_code: String(d.recipient_code),
  };
}
