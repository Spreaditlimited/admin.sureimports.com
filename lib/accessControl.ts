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
  "invoicing",
  "admin_mgt",
  "shipping_plans",
  "exchange_rates",
  "blog_management",
] as const;

export type ServiceKey = (typeof ALL_SERVICE_KEYS)[number];

export const DASHBOARD_ROUTE_SERVICE_MAP: Array<{ prefix: string; serviceKey: ServiceKey }> = [
  { prefix: "/dashboard/invoicing/payment-claims", serviceKey: "invoicing" },
  { prefix: "/dashboard/invoicing/receipts", serviceKey: "invoicing" },
  { prefix: "/dashboard", serviceKey: "dashboard" },
  { prefix: "/dashboard/procurement", serviceKey: "procurement" },
  { prefix: "/dashboard/corporate-gifts", serviceKey: "corporate_gifts" },
  { prefix: "/dashboard/pay-supplier", serviceKey: "pay_supplier" },
  { prefix: "/dashboard/shipping-only", serviceKey: "shipping_only" },
  { prefix: "/dashboard/verify-supplier", serviceKey: "verify_supplier" },
  { prefix: "/dashboard/pay-small-small", serviceKey: "pay_small_small" },
  { prefix: "/dashboard/store", serviceKey: "store_mgt" },
  { prefix: "/dashboard/store-sales", serviceKey: "store_mgt" },
  { prefix: "/dashboard/customer-accounts", serviceKey: "customer_accounts" },
  { prefix: "/dashboard/payout-requests", serviceKey: "payout_requests" },
  { prefix: "/dashboard/invoicing", serviceKey: "invoicing" },
  { prefix: "/dashboard/admin", serviceKey: "admin_mgt" },
  { prefix: "/dashboard/shipping-plans", serviceKey: "shipping_plans" },
  { prefix: "/dashboard/exchange-rates", serviceKey: "exchange_rates" },
  { prefix: "/dashboard/service-charges", serviceKey: "exchange_rates" },
  { prefix: "/dashboard/blog", serviceKey: "blog_management" },
];

export function isSuperAdminStatus(status?: string | null) {
  return status === "superadmin" || status === "L1";
}

export function hasServiceAccess(
  serviceKey: ServiceKey,
  userStatus?: string | null,
  serviceKeys: string[] = []
) {
  if (isSuperAdminStatus(userStatus)) return true;
  return serviceKeys.includes(serviceKey);
}

export function getRequiredServiceForPath(pathname: string): ServiceKey | null {
  // Profile and settings should remain available to any authenticated admin.
  if (pathname.startsWith("/dashboard/profile") || pathname.startsWith("/dashboard/settings")) {
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
  corporate_gifts: "/dashboard/corporate-gifts",
  pay_supplier: "/dashboard/pay-supplier",
  shipping_only: "/dashboard/shipping-only?status=SAVED",
  verify_supplier: "/dashboard/verify-supplier?status=SAVED",
  pay_small_small: "/dashboard/pay-small-small?status=SAVED",
  store_mgt: "/dashboard/store/view",
  customer_accounts: "/dashboard/customer-accounts/customers",
  payout_requests: "/dashboard/payout-requests/requests",
  invoicing: "/dashboard/invoicing",
  admin_mgt: "/dashboard/admin/view",
  shipping_plans: "/dashboard/shipping-plans/add",
  exchange_rates: "/dashboard/exchange-rates",
  blog_management: "/dashboard/blog/view",
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
