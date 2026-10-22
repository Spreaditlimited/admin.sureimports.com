import Link from 'next/link';
import { ChevronDown, ArrowUpRight } from 'lucide-react';

type Product = {
  id: number;
  pidProduct: string;
  productName: string | null;
  productLink: string | null;
  productCategory: string | null;
  productPrice: number | null;
  productQuantity: number | null;
  productWeight: number | null;
  shippingMeasurePerUnit: number | null;
  productInfo: string | null;
  productStatus: string | null;
};
export type CustomerOrder = {
  id: number;
  pidOrder: string;
  orderName: string | null;
  status: string | null;
  products: Product[];
  [field: string]: unknown;
};

const fields = [
  ['destinationCountry', 'Destination'], ['orderCategory', 'Category'],
  ['currencyType', 'Shop currency'], ['shippingPlan', 'Shipping plan'],
  ['shippingAddress', 'Delivery address'], ['orderStatus', 'Payment / order status'],
  ['orderType', 'Order type'], ['orderPriority', 'Priority'],
  ['orderTotalCost', 'Order total'], ['orderShippingCost', 'Shipping cost'],
  ['orderWeight', 'Shipping measurement'], ['shippingMeasurementUnit', 'Measurement unit'],
  ['vat', 'VAT'], ['serviceCharge', 'Service charge'],
  ['additionalCost', 'Additional cost'], ['additionalCostDescription', 'Additional cost details'],
  ['exchangeRate1', 'Exchange rate 1'], ['exchangeRate2', 'Exchange rate 2'], ['exchangeRate3', 'Exchange rate 3'],
  ['shippingCost1', 'Shipping cost 1'], ['shippingCost2', 'Shipping cost 2'], ['shippingCost3', 'Shipping cost 3'],
  ['devicePhoneRateNgn', 'Phone rate (NGN / device)'], ['deviceLaptopRateNgn', 'Laptop rate (NGN / device)'],
  ['shippingRateSnapshot', 'Shipping rate'], ['shippingRateCurrency', 'Shipping rate currency'],
  ['trackingCompany', 'Tracking company'], ['trackingNumber', 'Tracking number'],
  ['trackingLink', 'Tracking link'], ['orderNote', 'Order notes'],
  ['createdAt', 'Created'], ['updatedAt', 'Last updated'], ['claimedAt', 'Claimed'],
  ['pidAdmin', 'Assigned admin ID'], ['mergedIntoOrderId', 'Merged into order'],
] as const;

function valueText(value: unknown) {
  return value === null || value === undefined || value === '' ? 'Not provided' : String(value);
}
function safeUrl(value: unknown) {
  if (typeof value !== 'string') return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; } catch { return null; }
}

export default function CustomerOrderDetails({ order }: { order: CustomerOrder }) {
  const params = new URLSearchParams({ pidOrder: order.pidOrder, status: order.status || 'saved' });
  return (
    <details open className="group min-w-0 rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl bg-muted/30 p-4 [&::-webkit-details-marker]:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <div className="min-w-0">
          <h4 className="break-words text-sm font-bold">{order.orderName || order.pidOrder}</h4>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{order.pidOrder}</p>
          <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{order.status || order.orderStatus as string || 'Unknown'}</span>
        </div>
        <ChevronDown className="mt-1 h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-5 border-t border-border p-4 sm:p-5">
        <Link href={`/dashboard/procurement?${params}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto">
          Manage order <ArrowUpRight className="h-4 w-4" />
        </Link>
        <dl className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.filter(([key]) => order[key] !== null && order[key] !== undefined && order[key] !== '').map(([key, label]) => {
            const link = key === 'trackingLink' ? safeUrl(order[key]) : null;
            const value = key.endsWith('At') ? new Date(String(order[key])).toLocaleString() : valueText(order[key]);
            return <div key={key} className={`min-w-0 ${['shippingAddress', 'orderNote', 'additionalCostDescription'].includes(key) ? 'sm:col-span-2' : ''}`}>
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline">{value}</a> : value}</dd>
            </div>;
          })}
        </dl>
        <section className="space-y-3 border-t border-border pt-4">
          <h5 className="text-sm font-bold">Products ({order.products.length})</h5>
          {!order.products.length && <p className="text-sm text-muted-foreground">No products added yet.</p>}
          {order.products.map((product) => {
            const url = safeUrl(product.productLink);
            return <article key={product.id} className="min-w-0 space-y-3 rounded-lg border border-border bg-muted/20 p-3">
              <h6 className="break-words text-sm font-semibold">{product.productName || product.pidProduct}</h6>
              {url && <a href={url} target="_blank" rel="noopener noreferrer" className="block break-all text-xs text-primary underline">{product.productLink}</a>}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Product ID', product.pidProduct], ['Category', product.productCategory],
                  ['Unit price', product.productPrice == null ? null : `${valueText(order.currencyType)} ${product.productPrice}`],
                  ['Quantity', product.productQuantity], ['Weight', product.productWeight],
                  ['Shipping measure per unit', product.shippingMeasurePerUnit], ['Status', product.productStatus],
                ].map(([label, value]) => <div key={String(label)} className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words">{valueText(value)}</dd></div>)}
              </dl>
              {product.productInfo && <p className="whitespace-pre-wrap break-words text-sm">{product.productInfo}</p>}
            </article>;
          })}
        </section>
      </div>
    </details>
  );
}
