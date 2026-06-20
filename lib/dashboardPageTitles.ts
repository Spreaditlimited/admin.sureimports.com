const DASHBOARD_TITLE_SUFFIX = "Sure Imports Admin";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/admin/add": "Add Admin",
  "/dashboard/admin/view": "Manage Admins",
  "/dashboard/admin/whatsapp": "Admin WhatsApp",
  "/dashboard/blog/categories": "Blog Categories",
  "/dashboard/blog/create": "Create Blog Post",
  "/dashboard/blog/edit": "Edit Blog Post",
  "/dashboard/blog/publishers": "Blog Publishers",
  "/dashboard/blog/view": "Blog Posts",
  "/dashboard/buy-phones-laptops": "Buy Phones & Laptops",
  "/dashboard/buy-phones-laptops/add-category": "Add Device Category",
  "/dashboard/buy-phones-laptops/add-devices": "Add Devices",
  "/dashboard/buy-phones-laptops/view-category": "Device Categories",
  "/dashboard/corporate-gifts": "Corporate Gift Requests",
  "/dashboard/customer-accounts/customers": "Customers",
  "/dashboard/customer-accounts/transactions": "Wallet Transactions",
  "/dashboard/exchange-rates": "Exchange Rates",
  "/dashboard/financials": "Payments",
  "/dashboard/form-template/create": "Create Form Template",
  "/dashboard/form-template/view": "Form Templates",
  "/dashboard/invoicing": "Invoices",
  "/dashboard/invoicing/bank-accounts": "Bank Accounts",
  "/dashboard/invoicing/create": "Create Invoice",
  "/dashboard/invoicing/payment-claims": "Payment Claims",
  "/dashboard/invoicing/receipts": "Receipts",
  "/dashboard/invoicing/settings": "Invoicing Settings",
  "/dashboard/pay-small-small": "Pay Small Small",
  "/dashboard/pay-supplier": "Pay Supplier",
  "/dashboard/payout-requests/requests": "Payout Requests",
  "/dashboard/payout-requests/transactions": "Payout History",
  "/dashboard/procurement": "Procurement",
  "/dashboard/profile": "Profile",
  "/dashboard/refunds": "Refunds",
  "/dashboard/service-charges": "Service Charge & VAT",
  "/dashboard/settings": "Settings",
  "/dashboard/shipping-only": "Shipping Only",
  "/dashboard/shipping-plans": "Shipping Plans",
  "/dashboard/shipping-plans/add": "Shipping Plans",
  "/dashboard/special-sourcing": "Special Sourcing",
  "/dashboard/store/add": "Add Product",
  "/dashboard/store/details": "Product Details",
  "/dashboard/store/edit": "Edit Product",
  "/dashboard/store/view": "Products",
  "/dashboard/store-sales": "Store Orders",
  "/dashboard/verify-supplier": "Verify Supplier",
};

const dynamicPageTitles: Array<[RegExp, string]> = [
  [/^\/dashboard\/customer-accounts\/customers\/details$/, "Customer Details"],
  [/^\/dashboard\/invoicing\/[^/]+$/, "Invoice Details"],
  [/^\/dashboard\/invoicing\/[^/]+\/edit$/, "Edit Invoice"],
  [/^\/dashboard\/invoicing\/[^/]+\/preview$/, "Invoice Preview"],
];

function formatStatus(value: string | null): string {
  if (!value) return "";
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function getDashboardBrowserTitle(pathname: string, status: string | null): string {
  const routeTitle =
    pageTitles[pathname] ||
    dynamicPageTitles.find(([pattern]) => pattern.test(pathname))?.[1] ||
    "Dashboard";

  const statusLabel = formatStatus(status);
  const title = statusLabel ? `${routeTitle} - ${statusLabel}` : routeTitle;

  return `${title} | ${DASHBOARD_TITLE_SUFFIX}`;
}
