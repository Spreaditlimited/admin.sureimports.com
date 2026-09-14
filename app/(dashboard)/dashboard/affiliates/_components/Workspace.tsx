import Link from 'next/link';
import { Users, ReceiptText } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Prisma } from '@prisma/client';
import { conversionSelect, pagination, commissionSummary, type RefundAdjustment } from '@/lib/affiliate/adminVisibility';

export const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const input = 'mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const date = (value: Date | null | undefined) => value ? value.toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—';
export function money(value: unknown, currency: string | null | undefined) {
  const raw = String(value ?? '');
  if (!raw || !Number.isFinite(Number(raw))) return 'Not recorded';
  return `${currency || 'Currency not recorded'} ${Number(raw).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function Status({ value }: { value: string | null | undefined }) {
  return <span className="inline-flex max-w-full rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-semibold text-foreground">{(value || 'Not recorded').replaceAll('_', ' ').toLowerCase()}</span>;
}
export function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <header className="border-b border-border p-5 sm:px-6"><h2 className="text-base font-semibold text-foreground">{title}</h2>{description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</header>{children}
  </section>;
}
export function Empty({ title = 'No records yet', body = 'Activity will appear here when it is recorded.' }: { title?: string; body?: string }) {
  return <div className="flex flex-col items-center px-6 py-14 text-center"><span className="mb-4 rounded-full bg-muted p-4"><ReceiptText className="h-7 w-7 text-muted-foreground" aria-hidden="true" /></span><h3 className="text-base font-semibold text-foreground">{title}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p></div>;
}
export function Table({ headings, children }: { headings: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-border bg-muted/40 text-muted-foreground"><tr>{headings.map(heading => <th key={heading} scope="col" className="px-5 py-3.5 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">{children}</tbody></table></div>;
}
export function Cell({ children }: { children: ReactNode }) { return <td className="max-w-xs break-words px-5 py-4 align-top text-foreground">{children}</td>; }
export function Meta({ children }: { children: ReactNode }) { return <p className="mt-1.5 break-words text-xs leading-relaxed text-muted-foreground">{children}</p>; }
export function Detail({ label, children }: { label: string; children: ReactNode }) { return <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">{label}</dt><dd className="mt-1.5 break-words text-sm leading-relaxed text-foreground">{children || '—'}</dd></div>; }
export function Pager({ data, href }: { data: ReturnType<typeof pagination>; href: (page: number) => string }) {
  if (!data.total) return null;
  return <nav aria-label="Results pages" className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-5 text-sm text-muted-foreground"><span>{data.skip + 1}–{Math.min(data.skip + data.take, data.total)} of {data.total}</span><div className="flex items-center gap-3">{data.page > 1 && <Link className={button} href={href(data.page - 1)}>Previous</Link>}<span>{data.page} / {data.pages}</span>{data.page < data.pages && <Link className={button} href={href(data.page + 1)}>Next</Link>}</div></nav>;
}
export function Tabs({ tabs, current, base }: { tabs: { id: string; label: string }[]; current: string; base: string }) {
  return <nav aria-label="Affiliate workspace sections" className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:flex sm:flex-wrap">{tabs.map(tab => <Link key={tab.id} href={`${base}?tab=${tab.id}`} aria-current={current === tab.id ? 'page' : undefined} className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${current === tab.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{tab.label}</Link>)}</nav>;
}
export function Stats({ items }: { items: { label: string; value: number; note: string }[] }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{items.map(item => <article key={item.label} className="rounded-xl border border-border bg-card p-5 shadow-sm"><p className="text-sm font-medium text-muted-foreground">{item.label}</p><strong className="mt-2 block text-3xl font-semibold tracking-tight text-foreground">{item.value.toLocaleString('en-GB')}</strong><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.note}</p></article>)}</div>;
}
export function Identity({ name, subtitle }: { name: string; subtitle: string }) {
  return <header className="flex items-start gap-4"><div className="hidden rounded-xl border border-border bg-card p-3 sm:block"><Users className="h-6 w-6 text-primary" aria-hidden="true" /></div><div className="min-w-0"><h1 className="break-words text-2xl font-bold tracking-tight text-foreground">{name}</h1><p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{subtitle}</p></div></header>;
}
export function CommissionSummary({ rows }: { rows: Awaited<ReturnType<typeof commissionSummary>> }) {
  return <Panel title="Commission position" description="Current recorded commissions, separated by currency and status. Refund adjustments and payout details are shown with each commission; these figures are not customer revenue.">
    {rows.length ? <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">{rows.map(row => <div key={`${row.commissionCurrency}-${row.status}`} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-3"><Status value={row.status} /><span className="text-xs text-muted-foreground">{row._count._all} records</span></div><strong className="mt-3 block text-xl font-semibold tabular-nums text-foreground">{money(row._sum.commissionAmount, row.commissionCurrency)}</strong></div>)}</div> : <Empty title="No commissions recorded" body="Referrals do not earn a commission until an eligible purchase is recorded." />}
  </Panel>;
}
type Conversion = Prisma.affiliate_conversionsGetPayload<{ select: typeof conversionSelect }> & { refundAdjustments: RefundAdjustment[] };
export function Commissions({ rows, affiliateId }: { rows: Conversion[]; affiliateId: number }) {
  if (!rows.length) return <Empty title="No matching commissions" body="Commissions for eligible services will appear here, including records not linked to a referral." />;
  return <div className="divide-y divide-border">{rows.map(row => <article key={row.id} className="p-5 sm:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row"><div className="min-w-0"><h3 className="text-sm font-semibold text-foreground">{row.service.displayName}</h3><Meta>{row.sourceSystem} · {date(row.createdAt)}</Meta><p className="mt-2 break-all text-sm text-muted-foreground">{row.externalOrderReference}</p></div><div className="shrink-0 sm:text-right"><strong className="block text-lg font-semibold tabular-nums text-foreground">{money(row.commissionAmount, row.commissionCurrency)}</strong><div className="mt-2"><Status value={row.status} /></div></div></div>
    <details className="mt-4 rounded-lg border border-border"><summary className="cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Payment, calculation and payout details</summary><div className="space-y-5 border-t border-border p-4"><dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      <Detail label="Commission reference">{row.pidConversion}</Detail><Detail label="Customer payment">{money(row.grossAmount, row.paymentCurrency)}</Detail><Detail label="Eligible amount">{money(row.eligibleAmount, row.paymentCurrency)}</Detail><Detail label="Payment reference">{row.externalPaymentReference}</Detail><Detail label="Recorded rate / quantity">{row.commissionRate?.toString() || '—'} / {row.commissionBasisQuantity?.toString() || '—'} {row.commissionBasisUnit || ''}</Detail><Detail label="Release policy">{row.releaseMode} · {date(row.releaseAt)}</Detail><Detail label="Approved / available">{date(row.approvedAt)} / {date(row.availableAt)}</Detail><Detail label="Referral">{row.referralId && row.referral?.customerReference ? <Link className="text-primary underline underline-offset-4" href={`/dashboard/affiliates/${affiliateId}/referrals/${row.referralId}`}>Open referral</Link> : 'No customer referral linked'}</Detail><Detail label="Payout">{row.payoutItem ? <>{row.payoutItem.payout.pidPayout}<Meta>{row.payoutItem.payout.status} · {money(row.payoutItem.amount, row.payoutItem.payout.currency)}</Meta></> : 'Not included in a payout'}</Detail>
    </dl>{row.reversalReason && <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-foreground">Reversal: {row.reversalReason}<Meta>{row.reversalReference} · {date(row.voidedAt)}</Meta></p>}{row.refundAdjustments.length > 0 && <div><h4 className="text-sm font-semibold text-foreground">Refund adjustments</h4>{row.refundAdjustments.map(adjustment => <p key={adjustment.refundId} className="mt-2 break-words text-sm text-muted-foreground">{adjustment.refundId} · {money(adjustment.amount, adjustment.currency)} · {date(adjustment.createdAt)}</p>)}</div>}</div></details>
  </article>)}</div>;
}
