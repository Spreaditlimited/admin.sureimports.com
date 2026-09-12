/** Version 2 prices Nigerian RMB goods directly in NGN; USD is a reporting equivalent only. */
export function procurementProductValue(
  raw: number,
  currency: string,
  destination: string,
  rates: { ngnPerUsd: number; cnyPerUsd: number; ngnPerCny: number },
  version = 2,
) {
  const direct = version === 2 && destination.trim().toLowerCase() === 'nigeria' && currency === 'CNY';
  if (direct && (!Number.isFinite(rates.ngnPerCny) || rates.ngnPerCny <= 0))
    throw new Error('The RMB to NGN exchange rate is unavailable. Please contact support.');
  const ngn = direct
    ? raw * rates.ngnPerCny
    : currency === 'NGN' ? raw
    : (currency === 'CNY' ? raw / rates.cnyPerUsd : raw) * rates.ngnPerUsd;
  return { ngn, usd: ngn / rates.ngnPerUsd, direct };
}
