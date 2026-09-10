export type ShippingBillingUnit = 'KG' | 'CBM';

export function shippingBillingUnit(
  countryName: string | null | undefined,
  planName: string | null | undefined,
  storedUnit: string | null | undefined,
): ShippingBillingUnit {
  const nigeriaSea = countryName?.trim().toLowerCase() === 'nigeria'
    && planName?.trim().toUpperCase() === 'SEA_SHIPPING';
  if (nigeriaSea) return 'CBM';
  return storedUnit?.trim().toUpperCase() === 'CBM' ? 'CBM' : 'KG';
}
