export const dashboardFeatures = [
  { key: 'shop', label: 'Shop', paths: ['/dashboard/shop', '/dashboard/buy-phones-from-china', '/dashboard/buy-phones', '/dashboard/store'], nigeriaOnly: true },
  { key: 'wallet', label: 'Wallet', paths: ['/dashboard/wallet'], nigeriaOnly: true },
  { key: 'instalments', label: 'Pay Small Small', paths: ['/dashboard/pay-small-small', '/dashboard/pay-small-smallx'], nigeriaOnly: true },
  { key: 'orders', label: 'My Orders', paths: ['/dashboard/orders'], nigeriaOnly: true },
  { key: 'procurement', label: 'Buy From Chinese Websites', paths: ['/dashboard/procurement'], nigeriaOnly: false },
  { key: 'shipping', label: 'Ship with us', paths: ['/dashboard/shipping-only'], nigeriaOnly: false },
  { key: 'pay_supplier', label: 'Pay Supplier', paths: ['/dashboard/pay-supplier'], nigeriaOnly: true },
  { key: 'vehicles', label: 'My Vehicle Orders', paths: ['/dashboard/vehicles'], nigeriaOnly: false },
  { key: 'corporate_sourcing', label: 'Corporate Sourcing', paths: ['/dashboard/corporate-sourcing'], nigeriaOnly: false },
  { key: 'intelligence', label: 'Supplier Intelligence', paths: ['/dashboard/intelligence'], nigeriaOnly: false },
  { key: 'reports', label: 'My Supplier Reports', paths: ['/dashboard/my-reports'], nigeriaOnly: false },
  { key: 'verification', label: 'Verify a Supplier', paths: ['/dashboard/verify-supplier'], nigeriaOnly: false },
  { key: 'refunds', label: 'Refunds', paths: ['/dashboard/refunds', '/dashboard/refundsx'], nigeriaOnly: false },
  { key: 'invoices', label: 'My Invoices', paths: ['/dashboard/my-invoices'], nigeriaOnly: false },
] as const;
export type FeatureKey = typeof dashboardFeatures[number]['key'];
export type FeatureRules = Record<FeatureKey, boolean>;
export const defaultFeatureRules = Object.fromEntries(dashboardFeatures.map(f => [f.key, f.nigeriaOnly])) as FeatureRules;
export function featureForPath(href: string) {
  const path = href.split(/[?#]/)[0];
  return dashboardFeatures.find(f => f.paths.some(prefix => path === prefix || path.startsWith(prefix + '/')))?.key;
}
export function canSeeFeature(key: FeatureKey, country: string | null, rules: FeatureRules) {
  return Boolean(country) && (!rules[key] || country === 'Nigeria');
}
export function validateFeatureRules(value: unknown): value is FeatureRules {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === dashboardFeatures.length
    && dashboardFeatures.every(f => typeof (value as FeatureRules)[f.key] === 'boolean');
}
