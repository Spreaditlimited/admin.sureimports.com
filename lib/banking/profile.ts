import type { Prisma } from "@prisma/client";
import { bankFingerprint } from "./verification";
type DB = Pick<Prisma.TransactionClient, "$queryRaw">;
export async function verifiedProfileBank(tx: DB, pidUser: string) {
  const [bank] = await tx.$queryRaw<
    {
      bank_name: string;
      bank_code: string;
      bank_account_number: string;
      bank_account_name: string;
      bank_transfer_code: string;
      fingerprint: string | null;
      method: string | null;
    }[]
  >`SELECT u.bank_name,u.bank_code,u.bank_account_number,u.bank_account_name,u.bank_transfer_code,v.fingerprint,v.method FROM users u LEFT JOIN bank_profile_verifications v ON v.pidUser=u.pidUser WHERE u.pidUser=${pidUser} FOR UPDATE`;
  if (
    !bank?.bank_code ||
    !bank.bank_account_number ||
    !bank.bank_account_name ||
    !bank.bank_name ||
    !bank.bank_transfer_code ||
    bank.method !== "EMAIL_OTP_PAYSTACK" ||
    bank.fingerprint !== bankFingerprint(bank)
  )
    throw new Error(
      "Add or re-verify your bank account in Profile → Bank Details using email verification before a refund can be paid.",
    );
  return {
    fingerprint: bank.fingerprint,
    display: `${bank.bank_name} · ${bank.bank_account_name} · ${bank.bank_account_number}`,
    bank,
  };
}
