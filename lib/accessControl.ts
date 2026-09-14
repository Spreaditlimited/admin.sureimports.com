export const ALL_SERVICE_KEYS = [
  "dashboard",
  "procurement",
  "corporate_gifts",
  "pay_supplier",
  "shipping_only",
  "verify_supplier",
  "pay_small_small",
  "store_mgt",
  "customer_accounts",
  "payout_requests",
  "refunds",
  "invoicing",
  "admin_mgt",
  "shipping_plans",
  "exchange_rates",
  "blog_management",
  "supplier_intelligence",
  "consultations",
  "body_camera_solutions",
  "social_studio",
  "system_settings",
] as const;

export type ServiceKey = (typeof ALL_SERVICE_KEYS)[number];

export const DASHBOARD_ROUTE_SERVICE_MAP: Array<{ prefix: string; serviceKey: ServiceKey }> = [
  { prefix: "/dashboard/invoicing/bank-accounts", serviceKey: "system_settings" },
  { prefix: "/dashboard/invoicing/payment-claims", serviceKey: "invoicing" },
  { prefix: "/dashboard/invoicing/receipts", serviceKey: "invoicing" },
  { prefix: "/dashboard/intelligence", serviceKey: "supplier_intelligence" },
  { prefix: "/dashboard/consultations", serviceKey: "consultations" },
  { prefix: "/dashboard/body-camera-enquiries", serviceKey: "body_camera_solutions" },
  { prefix: "/dashboard/social-studio", serviceKey: "social_studio" },
  { prefix: "/dashboard/procurement", serviceKey: "procurement" },
  { prefix: "/dashboard/corporate-sourcing", serviceKey: "corporate_gifts" },
  { prefix: "/dashboard/corporate-gifts", serviceKey: "corporate_gifts" },
  { prefix: "/dashboard/pay-supplier", serviceKey: "pay_supplier" },
  { prefix: "/dashboard/shipping-only", serviceKey: "shipping_only" },
  { prefix: "/dashboard/verify-supplier", serviceKey: "verify_supplier" },
  { prefix: "/dashboard/pay-small-small", serviceKey: "pay_small_small" },
  { prefix: "/dashboard/store", serviceKey: "store_mgt" },
  { prefix: "/dashboard/store-sales", serviceKey: "store_mgt" },
  { prefix: "/dashboard/customer-accounts", serviceKey: "customer_accounts" },
  { prefix: "/dashboard/refunds", serviceKey: "refunds" },
  { prefix: "/dashboard/affiliate-program", serviceKey: "payout_requests" },
  { prefix: "/dashboard/affiliates", serviceKey: "payout_requests" },
  { prefix: "/dashboard/affiliate-payouts", serviceKey: "payout_requests" },
  { prefix: "/dashboard/payout-requests", serviceKey: "payout_requests" },
  { prefix: "/dashboard/invoicing", serviceKey: "invoicing" },
  { prefix: "/dashboard/admin", serviceKey: "admin_mgt" },
  { prefix: "/dashboard/shipping-plans", serviceKey: "shipping_plans" },
  { prefix: "/dashboard/exchange-rates", serviceKey: "exchange_rates" },
  { prefix: "/dashboard/service-charges", serviceKey: "exchange_rates" },
  { prefix: "/dashboard/blog", serviceKey: "blog_management" },
  { prefix: "/dashboard/settings", serviceKey: "system_settings" },
  { prefix: "/dashboard", serviceKey: "dashboard" },
];

export function isSuperAdminStatus(status?: string | null) {
  return status === "superadmin" || status === "L1";
}

export const SUPER_ADMIN_ONLY_ROUTE_PREFIXES = ["/dashboard/marketing", "/dashboard/partners"] as const;

export function isSuperAdminOnlyPath(pathname: string) {
  return SUPER_ADMIN_ONLY_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function hasServiceAccess(
  serviceKey: ServiceKey,
  userStatus?: string | null,
  serviceKeys: string[] = []
) {
  if (isSuperAdminStatus(userStatus)) return true;
  if (
    serviceKeys.includes("system_settings") &&
    ["admin_mgt", "shipping_plans", "exchange_rates"].includes(serviceKey)
  ) return true;
  return serviceKeys.includes(serviceKey);
}

export function getRequiredServiceForPath(pathname: string): ServiceKey | null {
  if (pathname.startsWith("/dashboard/profile")) {
    return null;
  }

  const match = DASHBOARD_ROUTE_SERVICE_MAP
    .filter((item) => pathname.startsWith(item.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.serviceKey ?? null;
}

const SERVICE_DEFAULT_ROUTE_MAP: Record<ServiceKey, string> = {
  dashboard: "/dashboard",
  procurement: "/dashboard/procurement?status=pending",
  corporate_gifts: "/dashboard/corporate-sourcing",
  pay_supplier: "/dashboard/pay-supplier",
  shipping_only: "/dashboard/shipping-only?status=request-received",
  verify_supplier: "/dashboard/verify-supplier?status=SAVED",
  pay_small_small: "/dashboard/pay-small-small?status=SAVED",
  store_mgt: "/dashboard/store/view",
  customer_accounts: "/dashboard/customer-accounts/customers",
  refunds: "/dashboard/refunds",
  payout_requests: "/dashboard/payout-requests/requests",
  invoicing: "/dashboard/invoicing",
  admin_mgt: "/dashboard/admin/view",
  shipping_plans: "/dashboard/shipping-plans/add",
  exchange_rates: "/dashboard/exchange-rates",
  blog_management: "/dashboard/blog/view",
  supplier_intelligence: "/dashboard/intelligence/reviews",
  consultations: "/dashboard/consultations",
  body_camera_solutions: "/dashboard/body-camera-enquiries",
  social_studio: "/dashboard/social-studio",
  system_settings: "/dashboard/settings",
};

export function getFirstAllowedDashboardRoute(
  userStatus?: string | null,
  serviceKeys: string[] = []
) {
  if (isSuperAdminStatus(userStatus)) return "/dashboard";

  for (const serviceKey of ALL_SERVICE_KEYS) {
    if (serviceKeys.includes(serviceKey)) {
      return SERVICE_DEFAULT_ROUTE_MAP[serviceKey];
    }
  }

  return null;
}

export const ADMIN_SERVICE_OPTIONS = [
  { key: 'dashboard', label: 'Dashboard & Payments' },
  { key: 'procurement', label: 'Procurement' },
  { key: 'corporate_gifts', label: 'Corporate Sourcing' },
  { key: 'pay_supplier', label: 'Pay Supplier' },
  { key: 'shipping_only', label: 'Shipping Only' },
  { key: 'system_settings', label: 'System Settings' },
  { key: 'verify_supplier', label: 'Verify Supplier' },
  { key: 'pay_small_small', label: 'Pay Small Small' },
  { key: 'store_mgt', label: 'Store Mgt.' },
  { key: 'customer_accounts', label: 'Customer Accounts' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'payout_requests', label: 'Payout Requests & Affiliate Program (configuration, affiliates and commissions)' },
  { key: 'invoicing', label: 'Invoicing' },
  { key: 'admin_mgt', label: 'Admin Mgt.' },
  { key: 'shipping_plans', label: 'Shipping Plans' },
  { key: 'exchange_rates', label: 'Exchange Rates & Service Charges' },
  { key: 'blog_management', label: 'Blog Management' },
  { key: 'supplier_intelligence', label: 'Supplier Intelligence' },
  { key: 'consultations', label: 'Consultations' },
  { key: 'body_camera_solutions', label: 'Body Camera Solutions' },
  { key: 'social_studio', label: 'Social Studio' },
] as const satisfies ReadonlyArray<{ key: ServiceKey; label: string }>;
