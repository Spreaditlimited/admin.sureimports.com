import { decimalUnits, majorAmount } from './money';

const SCALE = BigInt(100_000_000);
/** Recover the product-only principal from an immutable total, shipping and fee snapshot. */
export function productPrincipalUsd(total: string, shipping: string, servicePercent: string, vatPercent: string) {
  const merchandise = decimalUnits(total, 8) - decimalUnits(shipping, 8);
  const service = decimalUnits(servicePercent, 6);
  const vat = decimalUnits(vatPercent, 6);
  if (merchandise < BigInt(0) || service > SCALE || vat > SCALE) throw new Error('Invalid original order cost snapshot.');
  const multiplier = SCALE + (service * (SCALE + vat) / SCALE);
  return Number(merchandise * SCALE / multiplier) / Number(SCALE);
}

export function productRetentionRatio(beforeUsd: number, afterUsd: number) {
  if (![beforeUsd, afterUsd].every(Number.isFinite) || beforeUsd <= 0 || afterUsd < 0) throw new Error('Invalid product adjustment.');
  // A shipping refund or fee-rate change cannot create a product commission debit.
  return Math.min(1, afterUsd / beforeUsd).toFixed(8);
}

/** Apply to the remaining commission, not the original amount again on every refund. */
export function commissionReduction(remaining: string, retentionRatio: string) {
  const amount = decimalUnits(remaining, 2), ratio = decimalUnits(retentionRatio, 8);
  if (ratio > SCALE) throw new Error('Invalid retention ratio.');
  const retained = (amount * ratio + SCALE / BigInt(2)) / SCALE;
  return majorAmount(amount - retained);
}

