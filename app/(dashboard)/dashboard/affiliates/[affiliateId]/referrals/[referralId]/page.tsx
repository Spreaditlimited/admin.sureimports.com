import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAffiliateAdmin } from '@/lib/affiliate/adminAuth';
import { affiliateAccount, commissionSummary, conversionSelect, customerNames, customerPaymentScope, pagination, recordId, textParam, withRefundAdjustments, refundSettlements, type SearchParams } from '@/lib/affiliate/adminVisibility';
import { button, input, Cell, Commissions, CommissionSummary, date, Detail, Empty, Identity, Meta, money, Pager, Panel, Status, Table, Tabs } from '../../../_components/Workspace';

export const dynamic = 'force-dynamic';
const tabs = [{ id: 'payments', label: 'Customer payments' }, { id: 'invoices', label: 'Invoice payments' }, { id: 'commissions', label: 'Commissions' }, { id: 'refunds', label: 'Refunds' }, { id: 'deposits', label: 'Bank submissions' }];

export default async function ReferralPage({ params, searchParams }: { params: Promise<{ affiliateId: string; referralId: string }>; searchParams: Promise<SearchParams> }) {
  if (!(await requireAffiliateAdmin('view'))) redirect('/dashboard');
  const route = await params;
  const affiliateId = recordId(route.affiliateId), referralId = recordId(route.referralId);
  if (!affiliateId || !referralId) notFound();
  // Both IDs are required: changing the URL cannot borrow another affiliate's referral.
  const [account, referral] = await Promise.all([
    affiliateAccount(affiliateId),
    prisma.affiliate_referrals.findFirst({ where: { id: referralId, affiliateId, customerReference: { not: null } }, select: { id: true, pidReferral: true, customerReference: true, source: true, landingPath: true, firstTouchAt: true, lastTouchAt: true, claimedAt: true, convertedAt: true } }),
  ]);
  if (!account || !referral) notFound();
  const search = await searchParams;
  const tab = tabs.some(item => item.id === textParam(search.tab)) ? textParam(search.tab) : 'payments';
  const q = textParam(search.q);
  const register = textParam(search.register) === 'archive' ? 'archive' : 'current';
  const scope = customerPaymentScope(referral.customerReference);
  const [names, summary] = await Promise.all([customerNames([referral.customerReference]), commissionSummary(affiliateId, referralId)]);
  const customer = referral.customerReference ? names.get(referral.customerReference) : null;
  const base = `/dashboard/affiliates/${affiliateId}/referrals/${referralId}`;
  const href = (page: number) => `${base}?${new URLSearchParams({ tab, q, register, page: String(page) })}`;
  let content;
  if (tab === 'commissions') {
    const where = { affiliateId, referralId };
    const paging = pagination(search.page, await prisma.affiliate_conversions.count({ where }));
    const rows = await withRefundAdjustments(await prisma.affiliate_conversions.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: conversionSelect }));
    content = <Panel title="Earnings from this referral" description="Only explicitly linked commission records are shown. Expand a record to follow its calculation, refund adjustments and payout."><Commissions rows={rows} affiliateId={affiliateId} /><Pager data={paging} href={href} /></Panel>;
  } else if (!scope.ledger) {
    content = <Panel title="Customer activity"><Empty title="This visit has not claimed a customer account" body="No customer transactions can be attributed from a visit alone. Commissions explicitly linked to this referral remain visible in the Commissions tab." /></Panel>;
  } else if (tab === 'payments') {
    if (scope.main) {
      const currentWhere = { pidUser: scope.main, ...(q ? { OR: [{ pidPayment: { contains: q } }, { serviceID: { contains: q } }, { txRef: { contains: q } }, { txID: { contains: q } }, { paymentStatus: { contains: q } }] } : {}) };
      const archiveWhere = { pid_user: scope.main, ...(q ? { OR: [{ pidPayment: { contains: q } }, { pid_order: { contains: q } }, { tx_code: { contains: q } }, { payment_status: { contains: q } }] } : {}) };
      const paging = pagination(search.page, register === 'archive' ? await prisma.payment_records.count({ where: archiveWhere }) : await prisma.payments.count({ where: currentWhere }));
      const rows = register === 'archive'
        ? (await prisma.payment_records.findMany({ where: archiveWhere, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, pidPayment: true, pid_order: true, tx_code: true, payment_status: true, payment_type: true, currency_type: true, amount: true, service_type: true, createdAt: true } })).map(row => ({ id: row.id, ref: row.pidPayment, order: row.pid_order, providerRef: row.tx_code, status: row.payment_status, method: row.payment_type, currency: row.currency_type, amount: row.amount, service: row.service_type, createdAt: row.createdAt }))
        : (await prisma.payments.findMany({ where: currentWhere, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, pidPayment: true, serviceID: true, txRef: true, txID: true, paymentStatus: true, paymentType: true, currency: true, amount: true, serviceName: true, createdAt: true } })).map(row => ({ id: row.id, ref: row.pidPayment, order: row.serviceID, providerRef: row.txRef || row.txID, status: row.paymentStatus, method: row.paymentType, currency: row.currency, amount: row.amount, service: row.serviceName, createdAt: row.createdAt }));
      content = <Panel title="Sure Imports payment history" description="All customer payments across services and statuses. Records may predate attribution. The separate historical register may contain older representations of the same transaction; amounts are not combined."><div className="flex flex-wrap gap-3 border-b border-border p-5"><Link className={button} aria-current={register === 'current' ? 'page' : undefined} href={`${base}?tab=payments`}>Payment register</Link><Link className={button} aria-current={register === 'archive' ? 'page' : undefined} href={`${base}?tab=payments&register=archive`}>Historical records</Link></div><PaymentSearch tab={tab} q={q} base={base} register={register} />{rows.length ? <Table headings={['Payment / order', 'Service', 'Provider / method', 'Amount', 'Status', 'Recorded']}>{rows.map(row => <tr key={row.id}><Cell><strong className="text-sm">{row.ref}</strong><Meta>Order: {row.order || 'Not recorded'}</Meta><Meta>{row.providerRef}</Meta></Cell><Cell>{row.service || 'Not recorded'}</Cell><Cell>{row.method || 'Not recorded'}</Cell><Cell>{money(row.amount, row.currency)}</Cell><Cell><Status value={row.status} /></Cell><Cell>{date(row.createdAt)}</Cell></tr>)}</Table> : <Empty title="No matching payments" body="There are no matching payments in this register. Invoice payments and historical records can be checked separately." />}<Pager data={paging} href={href} /></Panel>;
    } else {
      const where = { customerReference: scope.ledger, ...(q ? { OR: [{ sourceOrderReference: { contains: q } }, { providerReference: { contains: q } }, { pidLedgerEntry: { contains: q } }, { status: { contains: q } }] } : {}) };
      const paging = pagination(search.page, await prisma.payment_ledger_entries.count({ where }));
      const rows = await prisma.payment_ledger_entries.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], select: {
        id: true, pidLedgerEntry: true, sourceSystem: true, sourcePaymentType: true, sourcePaymentId: true, sourceOrderReference: true, purpose: true, provider: true, providerReference: true, status: true, originalCurrency: true, originalAmount: true, settlementCurrency: true, settlementAmount: true, eligibleAmount: true, occurredAt: true, processingStatus: true,
        events: { select: { id: true, eventType: true, receivedAt: true, processedAt: true }, take: 10, orderBy: { receivedAt: 'desc' } }, _count: { select: { events: true } },
        conversion: { select: { pidConversion: true, affiliateId: true, commissionCurrency: true, commissionAmount: true, status: true } },
      } });
      content = <Panel title="LineScout payment ledger" description="All imported payments for this exact LineScout customer reference, including payments that do not earn commission. Provider events show changes such as refunds or reversals."><PaymentSearch tab={tab} q={q} base={base} />{rows.length ? <div className="divide-y divide-border">{rows.map(row => <article key={row.id} className="space-y-4 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><h3 className="text-sm font-semibold text-foreground">{row.purpose.replaceAll('_', ' ')}</h3><Meta>{row.sourceSystem} · {row.provider || 'Provider not recorded'} · {date(row.occurredAt)}</Meta></div><div><strong className="block text-lg font-semibold text-foreground">{money(row.originalAmount, row.originalCurrency)}</strong><div className="mt-2"><Status value={row.status} /></div></div></div><dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Detail label="Ledger reference">{row.pidLedgerEntry}</Detail><Detail label="Order reference">{row.sourceOrderReference}</Detail><Detail label="Provider reference">{row.providerReference}</Detail><Detail label="Settlement amount">{row.settlementAmount === null ? 'Not recorded' : money(row.settlementAmount, row.settlementCurrency)}</Detail><Detail label="Eligible amount">{money(row.eligibleAmount, row.originalCurrency)}</Detail><Detail label="Commission processing">{row.processingStatus}</Detail><Detail label="Linked commission">{row.conversion && row.conversion.affiliateId === affiliateId ? <>{money(row.conversion.commissionAmount, row.conversion.commissionCurrency)} · {row.conversion.status}<Meta>{row.conversion.pidConversion}</Meta></> : 'No commission for this affiliate'}</Detail></dl><details className="rounded-lg border border-border"><summary className="cursor-pointer px-4 py-3 text-sm font-medium text-primary">Provider event history ({row._count.events})</summary><div className="border-t border-border p-4">{row._count.events > 10 && <p className="mb-3 text-sm text-muted-foreground">Showing the 10 most recent events.</p>}{row.events.length ? row.events.map(event => <p key={event.id} className="mb-2 text-sm text-foreground">{event.eventType} · {date(event.receivedAt)}<Meta>{event.processedAt ? 'Processed' : 'Awaiting processing'}</Meta></p>) : <p className="text-sm text-muted-foreground">No events recorded.</p>}</div></details></article>)}</div> : <Empty title="No matching ledger entries" />}<Pager data={paging} href={href} /></Panel>;
    }
  } else if (tab === 'invoices') {
    if (!scope.main) {
      content = <Panel title="Invoice payments"><Empty title="Use the LineScout payment ledger" body="LineScout payments are recorded in Customer payments. Sure Imports invoice records are not matched to a LineScout customer by email." /></Panel>;
    } else {
      const where = { pidUser: scope.main };
      const [total, claimTotal] = await Promise.all([prisma.invoice_payments.count({ where }), prisma.invoice_payment_claims.count({ where })]);
      const paging = pagination(search.page, total), claimPaging = pagination(search.claimPage, claimTotal);
      const [rows, claims] = await Promise.all([
        prisma.invoice_payments.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ paidAt: 'desc' }, { id: 'desc' }], select: { id: true, pidInvoicePayment: true, pidInvoice: true, amount: true, currency: true, paymentMethod: true, reference: true, paidAt: true, invoice: { select: { invoiceNumber: true, status: true } } } }),
        prisma.invoice_payment_claims.findMany({ where, skip: claimPaging.skip, take: claimPaging.take, orderBy: [{ claimedAt: 'desc' }, { id: 'desc' }], select: { id: true, pidClaim: true, pidInvoice: true, claimedAmount: true, currency: true, paymentReference: true, status: true, claimedAt: true, reviewedAt: true, approvedInvoicePaymentPid: true } }),
      ]);
      content = <div className="space-y-6"><Panel title="Recorded invoice payments" description="Invoice payments are shown separately; where also represented in the payment register, they are not added twice to a revenue total.">{rows.length ? <Table headings={['Payment / invoice', 'Amount', 'Method', 'Reference', 'Paid']}>{rows.map(row => <tr key={row.id}><Cell>{row.invoice.invoiceNumber}<Meta>{row.pidInvoicePayment}</Meta><Meta>Invoice status: {row.invoice.status}</Meta></Cell><Cell>{money(row.amount, row.currency)}</Cell><Cell>{row.paymentMethod}</Cell><Cell>{row.reference || '—'}</Cell><Cell>{date(row.paidAt)}</Cell></tr>)}</Table> : <Empty title="No recorded invoice payments" />}<Pager data={paging} href={href} /></Panel><Panel title="Invoice payment claims" description="Claims are awaiting or have completed review. They are not proof of payment until confirmed.">{claims.length ? <Table headings={['Claim / invoice', 'Claimed amount', 'Status', 'Submitted / reviewed', 'Confirmed payment']}>{claims.map(row => <tr key={row.id}><Cell>{row.pidClaim}<Meta>{row.pidInvoice}</Meta><Meta>{row.paymentReference}</Meta></Cell><Cell>{money(row.claimedAmount, row.currency)}</Cell><Cell><Status value={row.status} /></Cell><Cell>{date(row.claimedAt)}<Meta>{date(row.reviewedAt)}</Meta></Cell><Cell>{row.approvedInvoicePaymentPid || 'Not confirmed'}</Cell></tr>)}</Table> : <Empty title="No invoice payment claims" />}<Pager data={claimPaging} href={page => `${base}?tab=invoices&claimPage=${page}&page=${paging.page}`} /></Panel></div>;
    }
  } else if (tab === 'refunds') {
    if (!scope.main) {
      content = <Panel title="LineScout refunds and reversals"><Empty title="Follow the original payment" body="LineScout refund and reversal events are recorded against their payment in the ledger. Open Customer payments for provider events, and Commissions for any resulting earning adjustment." /><div className="border-t border-border p-5"><Link className={button} href={`${base}?tab=payments`}>View payment ledger</Link></div></Panel>;
    } else {
      const where = { pidUser: scope.main };
      const paging = pagination(search.page, await prisma.refund_records.count({ where }));
      const rows = await prisma.refund_records.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, pidRefund: true, pidOrder: true, amount: true, currency: true, refundStatus: true, serviceType: true, createdAt: true } });
      const settlements = await refundSettlements(scope.main, rows.map(row => row.pidRefund));
      const byId = new Map(settlements.map(item => [item.refundId, item]));
      content = <Panel title="Customer refund requests" description="Requested refunds and recorded settlement outcomes. A request or approval is not proof of money returned.">{rows.length ? <Table headings={['Refund / order', 'Requested amount', 'Request status', 'Settlement', 'Requested']}>{rows.map(row => { const settlement = byId.get(row.pidRefund); return <tr key={row.id}><Cell>{row.pidRefund}<Meta>{row.pidOrder} · {row.serviceType}</Meta></Cell><Cell>{money(row.amount, row.currency)}</Cell><Cell><Status value={row.refundStatus} /></Cell><Cell>{settlement ? <>{money(settlement.settlementAmount, settlement.settlementCurrency)}<Meta>{settlement.method} · {settlement.status}</Meta><Meta>Rate: {settlement.exchangeRate.toString()} · {settlement.sourceCurrency} to {settlement.settlementCurrency}</Meta><Meta>{settlement.reference} · {date(settlement.settledAt)}</Meta></> : 'No settlement recorded'}</Cell><Cell>{date(row.createdAt)}</Cell></tr>; })}</Table> : <Empty title="No refund requests" />}<Pager data={paging} href={href} /></Panel>;
    }
  } else if (!scope.main) {
    content = <Panel title="Bank submissions"><Empty title="Managed in LineScout" body="This customer belongs to LineScout. Imported payment outcomes appear in Customer payments; Sure Imports bank-submission records do not apply to this customer reference." /></Panel>;
  } else {
    const where = { pidUser: scope.main };
    const paging = pagination(search.page, await prisma.bank_payment.count({ where }));
    const rows = await prisma.bank_payment.findMany({ where, skip: paging.skip, take: paging.take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, pidBankPayment: true, pidOrder: true, amount: true, currency: true, trxNumber: true, serviceType: true, bankStatus: true, status: true, createdAt: true } });
    content = <Panel title="Bank-payment submissions" description="Customer submissions awaiting or completing bank review. These are not additional revenue: a verified submission may also have a payment record.">{rows.length ? <Table headings={['Submission / order', 'Amount', 'Service', 'Review state', 'Created']}>{rows.map(row => <tr key={row.id}><Cell>{row.pidBankPayment}<Meta>{row.pidOrder}</Meta><Meta>{row.trxNumber}</Meta></Cell><Cell>{money(row.amount, row.currency)}</Cell><Cell>{row.serviceType}</Cell><Cell><Status value={row.bankStatus || row.status} /></Cell><Cell>{date(row.createdAt)}</Cell></tr>)}</Table> : <Empty title="No bank submissions" />}<Pager data={paging} href={href} /></Panel>;
  }
  return <main className="space-y-6 pb-10"><nav aria-label="Breadcrumb" className="flex flex-wrap gap-3 text-sm text-muted-foreground"><Link href="/dashboard/affiliates" className="text-primary hover:underline">Affiliates</Link><span aria-hidden="true">/</span><Link href={`/dashboard/affiliates/${affiliateId}`} className="text-primary hover:underline">{account.name}</Link><span aria-hidden="true">/</span><span>Referral</span></nav>
    <Identity name={customer?.name || (scope.main ? 'Linked Sure Imports customer' : scope.ledger ? 'LineScout customer' : 'Unclaimed referral')} subtitle={customer?.email || referral.customerReference || referral.pidReferral} />
    <Panel title="Ownership and attribution" description={`Owned by ${account.name}. Records are linked by their stored customer reference, not by matching names or email addresses.`}><dl className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3"><Detail label="Ownership"><Status value={referral.customerReference ? 'LOCKED' : 'UNCLAIMED'} /></Detail><Detail label="Source">{referral.source || 'Not recorded'}</Detail><Detail label="Customer reference">{referral.customerReference}</Detail><Detail label="First visit / claimed">{date(referral.firstTouchAt)} / {date(referral.claimedAt)}</Detail><Detail label="Last seen / converted">{date(referral.lastTouchAt)} / {date(referral.convertedAt)}</Detail><Detail label="Referral reference">{referral.pidReferral}</Detail></dl></Panel>
    <CommissionSummary rows={summary} /><Tabs tabs={tabs} current={tab} base={base} />{content}
  </main>;
}
function PaymentSearch({ tab, q, base, register = 'current' }: { tab: string; q: string; base: string; register?: string }) {
  return <form className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end"><input type="hidden" name="tab" value={tab} /><input type="hidden" name="register" value={register} /><label className="flex-1 text-sm font-medium text-foreground">Find a payment<input name="q" defaultValue={q} className={input} placeholder="Payment, order, provider reference or status" /></label><button className={button}>Search</button>{q && <Link className={button} href={`${base}?tab=payments&register=${register}`}>Clear</Link>}</form>;
}
