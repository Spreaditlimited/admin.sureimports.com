export type AdjustmentCost = {
  currency: 'NGN' | 'GBP'; productCostMinor: number; shippingMinor: number;
  serviceChargeMinor: number; taxMinor: number; otherChargesMinor: number;
  orderTotalMinor: number; partnerEarningsMinor: number;
  serviceChargeBps: number; partnerShareBps: number;
  config: { vatPercent: number; ngnPerUsd: number; gbpPerUsd?: number };
};
const minor = (value: number) => { if (!Number.isSafeInteger(value) || value < 0) throw new Error('Enter a valid non-negative amount.'); return BigInt(value); };
const safe = (value: bigint) => { if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount exceeds the supported limit.'); return Number(value); };
export function adjustedCost(before: AdjustmentCost, product: number, shipping: number) {
  if (!['NGN','GBP'].includes(before.currency)) throw new Error('Unsupported order currency.');
  const p=minor(product), freight=minor(shipping), other=minor(before.otherChargesMinor);
  for (const rate of [before.serviceChargeBps,before.partnerShareBps]) if (!Number.isInteger(rate) || rate < 0 || rate > 10000) throw new Error('The original service rates require review.');
  if (before.partnerShareBps > before.serviceChargeBps || !Number.isFinite(before.config.vatPercent) || before.config.vatPercent < 0 || before.config.vatPercent > 100) throw new Error('The original service rates require review.');
  const service=(p*BigInt(before.serviceChargeBps)+BigInt(5000))/BigInt(10000);
  const earnings=(p*BigInt(before.partnerShareBps)+BigInt(5000))/BigInt(10000);
  const tax=(service*BigInt(Math.round(before.config.vatPercent*100))+BigInt(5000))/BigInt(10000);
  const total=p+freight+other+service+tax;
  return {...before,productCostMinor:product,shippingMinor:shipping,serviceChargeMinor:safe(service),taxMinor:safe(tax),partnerEarningsMinor:safe(earnings),orderTotalMinor:safe(total),sureImportsServiceMinor:safe(service-earnings),sureImportsAllocationMinor:safe(total-earnings)};
}
export function adjustmentDelta(before: AdjustmentCost, after: AdjustmentCost) {
  if (before.currency!==after.currency) throw new Error('An adjustment cannot change the original order currency.');
  return safe(minor(after.orderTotalMinor)-minor(before.orderTotalMinor));
}
export function partnerNetEarnings(gross: number, fees: Array<{feeMinor: bigint|string;customerFeeMinor: bigint|string}>) {
  return safe(minor(gross)-fees.reduce((sum,row)=>{const fee=BigInt(row.feeMinor),collected=BigInt(row.customerFeeMinor);if(fee<BigInt(0)||collected<BigInt(0))throw new Error('Payment fee requires review.');return sum+(fee>collected?fee-collected:BigInt(0));},BigInt(0)));
}
