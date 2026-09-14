export type RefundCurrency = 'NGN' | 'USD' | 'GBP';

/** Decimal inputs are converted without binary floating-point arithmetic. */
export function decimalUnits(value: string | number, places: number): bigint {
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) throw new Error('Invalid monetary amount.');
  const [whole, fraction = ''] = text.split('.');
  const scale = BigInt(10) ** BigInt(places);
  const units =
    BigInt(whole) * scale +
    BigInt(fraction.slice(0, places).padEnd(places, '0'));
  return units + BigInt(Number(fraction[places] || '0') >= 5 ? 1 : 0);
}

export function convertMinor(amount: bigint, rate: string | number): bigint {
  const rateUnits = decimalUnits(rate, 8);
  if (amount < BigInt(0) || rateUnits <= BigInt(0))
    throw new Error('A positive exchange rate is required.');
  return (amount * rateUnits + BigInt(50_000_000)) / BigInt(100_000_000);
}

export function majorAmount(minor: bigint): string {
  if (minor < BigInt(0)) throw new Error('Invalid refund amount.');
  return `${minor / BigInt(100)}.${String(minor % BigInt(100)).padStart(2, '0')}`;
}

export function procurementRefund(
  amountUsd: number,
  destination: string,
  ngnPerUsd: number,
  deductionPercent = 0,
) {
  if (
    !Number.isFinite(amountUsd) ||
    amountUsd <= 0 ||
    !Number.isFinite(deductionPercent) ||
    deductionPercent < 0 ||
    deductionPercent > 100
  )
    throw new Error('Invalid refund calculation.');
  const usdUnits = decimalUnits(amountUsd.toFixed(8), 8);
  const deduction = decimalUnits(deductionPercent, 4);
  const nigeria = ['ng', 'nigeria'].includes(destination.trim().toLowerCase());
  const rateUnits = nigeria ? decimalUnits(ngnPerUsd, 8) : BigInt(100_000_000);
  if (rateUnits <= BigInt(0))
    throw new Error('A positive exchange rate is required.');
  const divisor = BigInt('100000000000000000000');
  const minor =
    (usdUnits * (BigInt(1_000_000) - deduction) * rateUnits +
      divisor / BigInt(2)) /
    divisor;
  return {
    currency: nigeria ? ('NGN' as const) : ('USD' as const),
    amount: majorAmount(minor),
  };
}

export function refundSettlementQuote(input: {
  amount: string;
  currency: string;
  customerCountry: string;
  gbpPerUsd?: string | number | null;
}) {
  const currency = input.currency.toUpperCase();
  if (!['NGN', 'USD'].includes(currency))
    throw new Error('This refund currency needs review before settlement.');
  const sourceMinor = decimalUnits(input.amount, 2);
  if (sourceMinor <= BigInt(0))
    throw new Error('There is no refundable amount.');
  const uk = ['gb', 'uk', 'united kingdom', 'great britain'].includes(
    input.customerCountry.trim().toLowerCase(),
  );
  const settlementCurrency = currency === 'USD' && uk ? 'GBP' : currency;
  const rate = settlementCurrency === 'GBP' ? input.gbpPerUsd : '1';
  if (!rate)
    throw new Error(
      'The USD-to-GBP refund rate is not configured. Please contact support.',
    );
  const settlementMinor = convertMinor(sourceMinor, rate);
  if (settlementMinor <= BigInt(0))
    throw new Error('The converted refund is below the minimum currency unit.');
  return {
    sourceCurrency: currency,
    sourceAmount: majorAmount(sourceMinor),
    settlementCurrency,
    settlementAmount: majorAmount(settlementMinor),
    exchangeRate: String(rate),
  };
}
