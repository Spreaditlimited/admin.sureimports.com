import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireAffiliateAdmin } from '@/lib/affiliate/adminAuth';
import { affiliateEmailHash, decryptAffiliateValue } from '@/lib/affiliate/security';

export const dynamic = 'force-dynamic';
const pageSize = 25;
const single = (value: string | string[] | undefined) => typeof value === 'string' ? value : '';

export default async function AffiliatesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await requireAffiliateAdmin('view'))) redirect('/dashboard');
  const params = await searchParams;
  const query = single(params.q).trim().slice(0, 254);
  const where = query ? { OR: [
    { referralCode: { contains: query } },
    { country: { contains: query } },
    ...(query.includes('@') ? [{ emailHash: affiliateEmailHash(query) }] : []),
  ] } : {};
  const total = await prisma.affiliate_accounts.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(single(params.page), 10) || 1));
  const accounts = await prisma.affiliate_accounts.findMany({
    where, skip: (page - 1) * pageSize, take: pageSize,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true, firstNameCiphertext: true, lastNameCiphertext: true, emailCiphertext: true,
      country: true, referralCode: true, status: true, createdAt: true,
      _count: { select: { referrals: true } },
    },
  });
  const href = (target: number) => `?${new URLSearchParams({ q: query, page: String(target) })}`;
  const button = 'inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return <div className="space-y-6 pb-10">
    <header className="flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold tracking-tight text-foreground">Affiliates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registered affiliate accounts, referral codes and account status. Waitlist entries are not affiliates.</p></div>
      <span className="shrink-0 rounded-md border border-border bg-muted/50 px-4 py-2 text-sm font-semibold text-foreground">{total.toLocaleString('en-GB')} {query ? 'matching' : 'registered'} accounts</span>
    </header>
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <form action="/dashboard/affiliates" className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-medium text-foreground">Search affiliates
          <input name="q" defaultValue={query} maxLength={254} placeholder="Full email address, referral code or country" className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </label>
        <button className={button} type="submit">Search</button>
        {query && <Link href="/dashboard/affiliates" className={button}>Clear</Link>}
      </form>
      {accounts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-muted-foreground"><tr>
          {['Affiliate', 'Country', 'Referral code', 'Status', 'Referrals', 'Joined'].map(label => <th key={label} scope="col" className="px-5 py-4 font-semibold">{label}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-border">{accounts.map(account => <tr key={account.id} className="transition-colors hover:bg-muted/30">
          <td className="px-5 py-4"><p className="font-semibold text-foreground">{decryptAffiliateValue(account.firstNameCiphertext)} {decryptAffiliateValue(account.lastNameCiphertext)}</p><p className="mt-1 text-muted-foreground">{decryptAffiliateValue(account.emailCiphertext)}</p></td>
          <td className="px-5 py-4 text-foreground">{account.country || '—'}</td>
          <td className="px-5 py-4"><code className="rounded bg-muted px-2 py-1 text-sm text-foreground">{account.referralCode}</code></td>
          <td className="px-5 py-4"><span className="inline-flex whitespace-nowrap rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-foreground">{account.status.toLowerCase().replaceAll('_', ' ')}</span></td>
          <td className="px-5 py-4 tabular-nums text-foreground">{account._count.referrals}</td>
          <td className="whitespace-nowrap px-5 py-4 text-muted-foreground"><time dateTime={account.createdAt.toISOString()}>{account.createdAt.toISOString().slice(0, 10)}</time></td>
        </tr>)}</tbody>
      </table></div> : <div className="flex flex-col items-center px-6 py-20 text-center">
        <div className="mb-5 rounded-full bg-muted p-5"><Users aria-hidden="true" className="h-8 w-8 text-muted-foreground" /></div>
        <h2 className="text-lg font-semibold text-foreground">{query ? 'No matching affiliates' : 'No affiliates yet'}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{query ? 'Try a full email address, referral code or country.' : 'Registered affiliate accounts will appear here when people sign up.'}</p>
      </div>}
      {total > 0 && <nav aria-label="Affiliate list pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5 text-sm text-muted-foreground">
        <span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
        <div className="flex items-center gap-3">{page > 1 && <Link href={href(page - 1)} className={button}>Previous</Link>}<span>Page {page} of {pages}</span>{page < pages && <Link href={href(page + 1)} className={button}>Next</Link>}</div>
      </nav>}
    </section>
  </div>;
}
