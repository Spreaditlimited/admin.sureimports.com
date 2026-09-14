import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAffiliateAdmin } from '@/lib/affiliate/adminAuth';
import { affiliateEmailHash } from '@/lib/affiliate/security';
import { affiliateAccount, commissionSummary, conversionSelect, customerNames, pagination, recordId, textParam, withRefundAdjustments, type SearchParams } from '@/lib/affiliate/adminVisibility';
import { button, input, Cell, Commissions, CommissionSummary, date, Detail, Empty, Identity, Meta, money, Pager, Panel, Stats, Status, Table, Tabs } from '../_components/Workspace';

export const dynamic = 'force-dynamic';
const tabs = [{ id: 'referrals', label: 'Registered referrals' }, { id: 'commissions', label: 'Commissions' }, { id: 'payouts', label: 'Payouts' }, { id: 'shipping', label: 'Owned shipments' }, { id: 'notifications', label: 'Email delivery' }];

export default async function AffiliatePage({ params, searchParams }: { params: Promise<{ affiliateId: string }>; searchParams: Promise<SearchParams> }) {
  if (!(await requireAffiliateAdmin('view'))) redirect('/dashboard');
  const id = recordId((await params).affiliateId);
  if (!id) notFound();
  const account = await affiliateAccount(id);
  if (!account) notFound();
  const search = await searchParams;
  const tab = tabs.some(item => item.id === textParam(search.tab)) ? textParam(search.tab) : 'referrals';
  const q = textParam(search.q);
  const base = `/dashboard/affiliates/${id}`;
  const href = (page: number) => `${base}?${new URLSearchParams({ tab, q, page: String(page) })}`;
  const [summary, claimed, paying] = await Promise.all([
    commissionSummary(id),
    prisma.affiliate_referrals.count({ where: { affiliateId: id, customerReference: { not: null } } }),
    prisma.affiliate_referrals.count({ where: { affiliateId: id, customerReference: { not: null }, conversions: { some: {} } } }),
  ]);
  let content;
  if (tab === 'referrals') {
    const where = { affiliateId: id, customerReference: { not: null }, ...(q ? { OR: [{ pidReferral: { contains: q } }, { customerReference: { contains: q } }, { source: { contains: q } }] } : {}) };
    const paging = pagination(search.page, await prisma.affiliate_referrals.count({ where }));
    const rows = await prisma.affiliate_referrals.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ firstTouchAt: 'desc' }, { id: 'desc' }], select: {
      id: true, pidReferral: true, customerReference: true, source: true, claimedAt: true, firstTouchAt: true, _count: { select: { conversions: true } },
    } });
    const names = await customerNames(rows.map(row => row.customerReference));
    content = <Panel title="Registered referrals" description="Only customers with an established referral relationship appear here. Anonymous link visits are not referrals.">
      <form className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end"><input type="hidden" name="tab" value={tab} /><label className="flex-1 text-sm font-medium text-foreground">Find a referral<input name="q" defaultValue={q} className={input} placeholder="Referral reference, customer reference or source" /></label><button className={button}>Search</button>{q && <Link className={button} href={base}>Clear</Link>}</form>
      {rows.length ? <Table headings={['Customer / referral', 'Source', 'Ownership', 'Commissions', 'First seen']}>{rows.map(row => { const customer = row.customerReference ? names.get(row.customerReference) : null; return <tr key={row.id} className="hover:bg-muted/30"><Cell><Link className="font-semibold text-primary underline-offset-4 hover:underline" href={`${base}/referrals/${row.id}`}>{customer?.name || (row.customerReference?.startsWith('linescout:') ? 'LineScout customer' : 'Registered customer')}</Link><Meta>{customer?.email || row.customerReference || row.pidReferral}</Meta></Cell><Cell>{row.source || 'Not recorded'}</Cell><Cell><Status value={row.customerReference ? 'OWNERSHIP_LOCKED' : 'NOT_YET_CLAIMED'} /><Meta>{date(row.claimedAt)}</Meta></Cell><Cell>{row._count.conversions}</Cell><Cell>{date(row.firstTouchAt)}</Cell></tr>; })}</Table> : <Empty title="No matching referrals" body="Customers will appear once their accounts are linked to this affiliate. Anonymous website visits are not listed here." />}
      <Pager data={paging} href={href} />
    </Panel>;
  } else if (tab === 'commissions') {
    const where = { affiliateId: id, ...(q ? { OR: [{ pidConversion: { contains: q } }, { externalOrderReference: { contains: q } }, { externalPaymentReference: { contains: q } }, { status: q.toUpperCase() }, { payoutItem: { is: { payout: { pidPayout: q } } } }] } : {}) };
    const paging = pagination(search.page, await prisma.affiliate_conversions.count({ where }));
    const rows = await withRefundAdjustments(await prisma.affiliate_conversions.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: conversionSelect }));
    content = <Panel title="Commission history" description="Inspect the purchase basis, release dates, refund deductions and payout linked to each earning."><form className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end"><input type="hidden" name="tab" value={tab} /><label className="flex-1 text-sm font-medium text-foreground">Find a commission<input name="q" defaultValue={q} className={input} placeholder="Order, payment, payout, commission reference or status" /></label><button className={button}>Search</button>{q && <Link className={button} href={`${base}?tab=commissions`}>Clear</Link>}</form><Commissions rows={rows} affiliateId={id} /><Pager data={paging} href={href} /></Panel>;
  } else if (tab === 'payouts') {
    const where = { affiliateId: id };
    const paging = pagination(search.page, await prisma.affiliate_payouts.count({ where }));
    const [rows, totals] = await Promise.all([
      prisma.affiliate_payouts.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }], select: {
        id: true, pidPayout: true, provider: true, currency: true, amount: true, status: true, providerStatus: true, externalReference: true, requestedAt: true, processedAt: true, failedAt: true, failureReason: true, _count: { select: { items: true } },
      } }),
      prisma.affiliate_payouts.groupBy({ by: ['currency', 'status'], where, _sum: { amount: true }, orderBy: [{ currency: 'asc' }, { status: 'asc' }] }),
    ]);
    content = <Panel title="Payout history" description="Requested amounts and provider outcomes are separate from earned commissions. This view cannot initiate or approve a transfer.">{totals.length > 0 && <div className="flex flex-wrap gap-3 border-b border-border p-5">{totals.map(total => <div key={`${total.currency}-${total.status}`} className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-foreground"><Status value={total.status} /><strong className="ml-3 tabular-nums">{money(total._sum.amount, total.currency)}</strong></div>)}</div>}
      {rows.length ? <Table headings={['Payout', 'Amount', 'Status', 'Timing', 'Included earnings']}>{rows.map(row => <tr key={row.id}><Cell><strong className="text-sm">{row.provider}</strong><Meta>{row.pidPayout}</Meta><Meta>{row.externalReference || 'Provider reference not assigned'}</Meta></Cell><Cell>{money(row.amount, row.currency)}</Cell><Cell><Status value={row.status} /><Meta>{row.providerStatus}</Meta>{row.failureReason && <Meta>{row.failureReason}</Meta>}</Cell><Cell>Requested {date(row.requestedAt)}<Meta>Processed {date(row.processedAt)}</Meta>{row.failedAt && <Meta>Failed {date(row.failedAt)}</Meta>}</Cell><Cell><Link className="text-primary underline underline-offset-4" href={`${base}?tab=commissions&q=${encodeURIComponent(row.pidPayout)}`}>{row._count.items} commissions</Link></Cell></tr>)}</Table> : <Empty title="No payout requests" body="Payouts appear once the affiliate requests a withdrawal." />}<Pager data={paging} href={href} /></Panel>;
  } else if (tab === 'shipping') {
    const where = { affiliateId: id };
    const paging = pagination(search.page, await prisma.shipping_request_attributions.count({ where }));
    const rows = await prisma.shipping_request_attributions.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, pidShippingOnly: true, referralId: true, referral: { select: { customerReference: true } }, sourceType: true, sourceReference: true, lockedAt: true, _count: { select: { invoiceSnapshots: true } } } });
    content = <Panel title="Owned shipping requests" description="Includes API-created shipping requests, including those that have not generated a commission yet.">{rows.length ? <Table headings={['Shipping request', 'Source', 'Ownership locked', 'Commission invoices', 'Referral']}>{rows.map(row => <tr key={row.id}><Cell>{row.pidShippingOnly}</Cell><Cell>{row.sourceType}<Meta>{row.sourceReference}</Meta></Cell><Cell>{date(row.lockedAt)}</Cell><Cell>{row._count.invoiceSnapshots}</Cell><Cell>{row.referralId && row.referral?.customerReference ? <Link className="text-primary underline underline-offset-4" href={`${base}/referrals/${row.referralId}`}>Open referral</Link> : 'Request-level ownership'}</Cell></tr>)}</Table> : <Empty title="No owned shipping requests" />}<Pager data={paging} href={href} /></Panel>;
  } else {
    // Delivery state only: never render raw mail payloads or provider error internals.
    const where = { recipientHash: affiliateEmailHash(account.email) };
    const paging = pagination(search.page, await prisma.affiliate_email_events.count({ where }));
    const rows = await prisma.affiliate_email_events.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, eventType: true, status: true, attempts: true, createdAt: true, sentAt: true } });
    content = <Panel title="Notification delivery" description="Delivery attempts for this affiliate’s email address. Sent means accepted for sending, not proof that the message was read.">{rows.length ? <Table headings={['Event', 'Delivery state', 'Attempts', 'Created', 'Sent']}>{rows.map(row => <tr key={row.id}><Cell>{row.eventType.replaceAll('_', ' ').toLowerCase()}</Cell><Cell><Status value={row.status} /></Cell><Cell>{row.attempts}</Cell><Cell>{date(row.createdAt)}</Cell><Cell>{date(row.sentAt)}</Cell></tr>)}</Table> : <Empty title="No recorded notifications" />}<Pager data={paging} href={href} /></Panel>;
  }
  return <main className="space-y-6 pb-10">
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground"><Link className="text-primary hover:underline" href="/dashboard/affiliates">Affiliates</Link><span className="mx-3" aria-hidden="true">/</span><span>Affiliate workspace</span></nav>
    <div className="flex flex-col justify-between gap-4 sm:flex-row"><Identity name={account.name} subtitle={`${account.email} · ${account.country || 'Country not recorded'}`} /><div className="flex items-start gap-3"><Status value={account.status} /><code className="rounded-md bg-muted px-3 py-1.5 text-sm text-foreground">{account.referralCode}</code></div></div>
    <Stats items={[{ label: 'Registered referrals', value: claimed, note: 'Customer reference permanently assigned' }, { label: 'Commission records', value: account._count.conversions, note: 'Eligible purchase and renewal records' }, { label: 'Referrals with commissions', value: paying, note: 'Includes all commission statuses' }, { label: 'Owned shipments', value: account._count.shippingAttributions, note: 'Direct referrals and developer API requests' }]} />
    <details className="rounded-xl border border-border bg-card shadow-sm"><summary className="cursor-pointer p-5 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Account, consent and payout setup</summary><dl className="grid gap-6 border-t border-border p-5 sm:grid-cols-2 xl:grid-cols-3"><Detail label="Affiliate reference">{account.pidAffiliate}</Detail><Detail label="Phone">{account.phone}</Detail><Detail label="Joined / last sign-in">{date(account.createdAt)} / {date(account.lastLoginAt)}</Detail><Detail label="Email verified">{date(account.emailVerifiedAt)}</Detail><Detail label="Terms accepted">{date(account.termsAcceptedAt)} · {account.consentVersion}</Detail><Detail label="Additional referral codes">{account.referralAliases.length ? account.referralAliases.map(alias => <p key={alias.id}>{alias.aliasCode} · {alias.sourceSystem} · {alias.active ? 'active' : 'inactive'}</p>) : 'None'}</Detail><Detail label="Payout destinations">{account.payoutAccounts.length ? account.payoutAccounts.map(destination => <p key={destination.id}>{destination.provider} · {destination.currency} · {destination.status.toLowerCase()}<Meta>Verified {date(destination.verifiedAt)}</Meta></p>) : 'Not configured'}</Detail></dl></details>
    <CommissionSummary rows={summary} />
    <Tabs tabs={tabs} current={tab} base={base} />{content}
  </main>;
}
