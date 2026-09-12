import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Globe } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requirePartnerReviewer } from '@/lib/partners/review';
import DomainActions from './DomainActions';
export const dynamic='force-dynamic';
type Row={id:string;hostname:string;legalName:string;status:string;lastError:string|null;expiresAt:Date|null};
type Event={id:string;hostname:string;action:string;message:string;createdAt:Date};
export default async function Page({searchParams}:{searchParams:Promise<{q?:string;page?:string}>}) {
  if(!await requirePartnerReviewer())redirect('/dashboard');
  const query=await searchParams;const q=(query.q||'').slice(0,100),page=Math.max(1,Math.min(10000,parseInt(query.page||'1',10)||1)),offset=(page-1)*25;
  const [rows,events]=await Promise.all([
    prisma.$queryRaw<Row[]>`SELECT d.id,d.hostname,p.legalName,d.status,d.lastError,d.expiresAt FROM procurement_partner_domains d INNER JOIN procurement_partners p ON p.id=d.partnerId WHERE LOCATE(${q},d.hostname)>0 OR LOCATE(${q},p.legalName)>0 ORDER BY (d.status IN ('CHECK_FAILED','EXPIRED','SUSPENDED')) DESC,d.createdAt DESC LIMIT 25 OFFSET ${offset}`,
    prisma.$queryRaw<Event[]>`SELECT e.id,d.hostname,e.action,e.message,e.createdAt FROM procurement_partner_domain_events e INNER JOIN procurement_partner_domains d ON d.id=e.domainId ORDER BY e.createdAt DESC LIMIT 30`,
  ]);
  return <div className="space-y-6 pb-10"><header className="px-1"><Link className="text-sm text-muted-foreground underline" href="/dashboard/partners">Partner applications</Link><h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">Partner domains</h1><p className="mt-1 text-sm text-muted-foreground">Review connection failures and provisioning history. Recovery never skips ownership, DNS or HTTPS checks.</p></header>
    <form className="flex gap-3"><input aria-label="Search domains or businesses" name="q" defaultValue={q} placeholder="Search domain or business" className="min-w-0 flex-1 rounded-lg border border-input bg-background px-4 py-3 text-base"/><button className="rounded-lg border border-border px-5 py-3">Search</button></form>
    {!rows.length?<section className="mx-2 rounded-xl border-2 border-dashed border-border bg-muted/5 py-24 text-center"><Globe className="mx-auto mb-4 h-12 w-12 text-muted-foreground/20"/><p className="text-sm font-bold uppercase italic tracking-widest text-muted-foreground">No partner domains found</p></section>:<section className="overflow-hidden rounded-xl border border-border bg-card"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-muted/40"><tr>{['Business / domain','Status','Expiry','Recovery'].map(h=><th key={h} className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id} className="border-b border-border last:border-0"><td className="px-5 py-4"><strong className="block">{row.hostname}</strong><span className="text-muted-foreground">{row.legalName}</span></td><td className="max-w-sm px-5 py-4"><span>{row.status.replaceAll('_',' ')}</span>{row.lastError&&<p className="mt-1 text-destructive">{row.lastError}</p>}</td><td className="whitespace-nowrap px-5 py-4">{row.expiresAt?.toISOString().slice(0,10)||'External registrar'}</td><td className="px-5 py-4"><DomainActions id={row.id} suspended={row.status==='SUSPENDED'}/></td></tr>)}</tbody></table></div></section>}
    <nav className="flex justify-end gap-5 text-sm">{page>1&&<Link href={`?page=${page-1}&q=${encodeURIComponent(q)}`}>Previous</Link>}<span>Page {page}</span>{rows.length===25&&<Link href={`?page=${page+1}&q=${encodeURIComponent(q)}`}>Next</Link>}</nav>
    <section className="rounded-xl border border-border bg-card p-5"><h2 className="mb-4 font-semibold">Recent provisioning history</h2>{events.length?events.map(e=><div key={e.id} className="border-t border-border py-3 text-sm"><strong>{e.hostname}</strong><p className="mt-1 text-muted-foreground">{e.message}</p><time className="text-xs text-muted-foreground">{e.createdAt.toISOString().replace('T',' ').slice(0,16)} UTC</time></div>):<p className="text-sm text-muted-foreground">No provisioning events yet.</p>}</section>
  </div>;
}
