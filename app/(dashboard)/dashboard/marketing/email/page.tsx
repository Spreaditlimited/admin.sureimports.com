import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Mail, ShieldCheck } from 'lucide-react';

import { isSuperAdminStatus } from '@/lib/accessControl';
import { verifyToken } from '@/lib/jwt';
import { getMarketingSendMode, SES_MARKETING_CUTOVER_AT } from '@/lib/marketing/config';
import { prisma } from '@/lib/prisma';
import EmailOperations from './EmailOperations';

async function requireAccess() {
  const token = (await cookies()).get('token')?.value;
  if (!token) redirect('/auth/login');
  const payload = verifyToken(token) as { pidUser?: string } | null;
  if (!payload?.pidUser) redirect('/auth/login');
  const admin = await prisma.admin.findUnique({ where: { pidUser: payload.pidUser }, select: { userStatus: true } });
  if (!admin || !isSuperAdminStatus(admin.userStatus)) redirect('/dashboard');
}

export default async function MarketingEmailPage() {
  await requireAccess();
  const [contacts, deliveries, events, sequence, recentContacts] = await Promise.all([
    prisma.marketing_contacts.count(), prisma.marketing_deliveries.count(), prisma.marketing_events.count(),
    prisma.marketing_sequences.findFirst({
      where: { pidSequence: 'SEQ-CHINA-IMPORT-52-WEEKS' },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    }),
    prisma.marketing_contacts.findMany({
      where: { createdAt: { gte: SES_MARKETING_CUTOVER_AT } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50,
      select: { email: true, firstName: true, lastName: true, consentStatus: true, optInRequestedAt: true },
    }),
  ]);
  const mode = getMarketingSendMode();
  const steps = (sequence?.steps || []).map(({ pidStep, stepNumber, title, subject }) => ({ pidStep, stepNumber, title, subject }));

  return <main className="space-y-7 pb-20">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-center">
      <div className="flex items-center gap-4"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Mail className="h-6 w-6" /></div><div><h1 className="text-xl font-bold">Email Operations</h1><p className="mt-1 text-xs text-muted-foreground">Amazon SES marketing control centre</p></div></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700"><ShieldCheck className="h-3.5 w-3.5" /> {mode} mode</span>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Contacts', contacts], ['Sequence emails', steps.length], ['Deliveries', deliveries], ['Provider events', events]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-soft"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
    </div>
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm leading-relaxed"><strong>The channel cutover is active.</strong> Existing Flodesk contacts remain there. New contacts receive a branded Sure Imports confirmation through Hostinger and are not eligible until they explicitly confirm.</div>
    <EmailOperations steps={steps} />
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"><div className="border-b border-border px-6 py-4"><h2 className="font-bold">Post-cutover email contacts</h2><p className="text-xs text-muted-foreground">Pending contacts have received a confirmation request. Only confirmed contacts can enter a future SES sequence.</p></div><div className="divide-y divide-border">{recentContacts.length ? recentContacts.map((contact) => <div key={contact.email} className="flex flex-col justify-between gap-2 px-6 py-3 text-sm sm:flex-row sm:items-center"><div><span className="font-semibold">{[contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Subscriber'}</span><p className="text-xs text-muted-foreground">{contact.email}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ${contact.consentStatus === 'OPTED_IN' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}>{contact.consentStatus.replaceAll('_', ' ')}</span></div>) : <p className="px-6 py-5 text-sm text-muted-foreground">No post-cutover contacts yet.</p>}</div></section>
    {steps.length > 0 && <section className="overflow-hidden rounded-xl border border-border bg-card shadow-soft"><div className="border-b border-border px-6 py-4"><h2 className="font-bold">Imported sequence</h2><p className="text-xs text-muted-foreground">{sequence?.name}</p></div><div className="max-h-[560px] divide-y divide-border overflow-y-auto">{steps.map((step) => <div key={step.pidStep} className="grid gap-1 px-6 py-4 md:grid-cols-[80px_1fr]"><span className="text-xs font-bold text-primary">Email {step.stepNumber}</span><div><p className="text-sm font-semibold">{step.subject}</p><p className="text-xs text-muted-foreground">{step.title}</p></div></div>)}</div></section>}
  </main>;
}
