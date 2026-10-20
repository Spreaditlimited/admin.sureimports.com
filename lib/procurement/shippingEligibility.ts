export const goodsCategories = [
  'Other Goods',
  'Goods with Battery',
  'Raw Batteries',
  'Liquids, Gases, Powder',
] as const;

export function requiresSpecialHandling(category: string | null | undefined) {
  return category === 'Goods with Battery' || category === 'Raw Batteries' || category === 'Liquids, Gases, Powder';
}

export const shippingEligibilityMessage = 'Battery goods, batteries and liquids can use Special, Express or Sea shipping, where available for your destination. Please choose a suitable shipping plan.';

export function isShippingPlanAllowed(category: string | null | undefined, planName: string | null | undefined) {
  if (!requiresSpecialHandling(category)) return true;
  return ['SPECIAL_SHIPPING', 'EXPRESS_SHIPPING', 'SEA_SHIPPING'].includes((planName || '').trim().toUpperCase());
}
