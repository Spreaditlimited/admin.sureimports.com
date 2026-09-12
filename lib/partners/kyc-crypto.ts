import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

// Wire-compatible with Sure Imports onboarding. Test both directions before changing.
function key() {
  const master = Buffer.from(
    process.env.AFFILIATE_SECURITY_KEY || "",
    "base64",
  );
  if (master.length !== 32)
    throw new Error("KYC encryption is not configured.");
  return Buffer.from(
    hkdfSync(
      "sha256",
      master,
      Buffer.alloc(0),
      "sureimports-partner-kyc-v1",
      32,
    ),
  );
}
export function encryptKyc(data: Buffer, partnerId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(partnerId));
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
}
export function decryptKyc(data: Buffer, partnerId: string) {
  if (data.length < 29 || data[0] !== 1)
    throw new Error("Invalid KYC envelope.");
  const decipher = createDecipheriv("aes-256-gcm", key(), data.subarray(1, 13));
  decipher.setAAD(Buffer.from(partnerId));
  decipher.setAuthTag(data.subarray(13, 29));
  return Buffer.concat([decipher.update(data.subarray(29)), decipher.final()]);
}
