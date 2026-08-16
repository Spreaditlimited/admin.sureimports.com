import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Mail, ShieldCheck } from 'lucide-react';

import { isSuperAdminStatus } from '@/lib/accessControl';
import { verifyToken } from '@/lib/jwt';
import {
  getMarketingProvider,
  getMarketingProviderLabel,
  getMarketingSendMode,
  SES_MARKETING_CUTOVER_AT,
} from '@/lib/marketing/config';
import { prisma } from '@/lib/prisma';
import EmailOperations from './EmailOperations';
import EmailRecords from './EmailRecords';

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
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        email: true, firstName: true, lastName: true, status: true,
        consentStatus: true, consentSource: true, consentAt: true,
        optInRequestedAt: true, optInExpiresAt: true, unsubscribedAt: true,
        bouncedAt: true, complainedAt: true, createdAt: true, updatedAt: true,
      },
    }),
  ]);
  const postCutoverUsers = recentContacts.length
    ? await prisma.users.findMany({
        where: { userEmail: { in: recentContacts.map((contact) => contact.email) } },
        select: { userEmail: true, createdAt: true },
      })
    : [];
  const provider = getMarketingProvider();
  const providerLabel = getMarketingProviderLabel();
  const mode = provider === 'hostinger' ? 'production' : getMarketingSendMode();
  const steps = (sequence?.steps || []).map(({ pidStep, stepNumber, title, subject }) => ({ pidStep, stepNumber, title, subject }));
  const joinedAtByEmail = new Map(
    postCutoverUsers.map((user) => [user.userEmail.trim().toLowerCase(), user.createdAt?.toISOString() || null]),
  );
  const contactRows = recentContacts.map((contact) => ({
    ...contact,
    joinedAt: joinedAtByEmail.get(contact.email.trim().toLowerCase()) || null,
    consentAt: contact.consentAt?.toISOString() || null,
    optInRequestedAt: contact.optInRequestedAt?.toISOString() || null,
    optInExpiresAt: contact.optInExpiresAt?.toISOString() || null,
    unsubscribedAt: contact.unsubscribedAt?.toISOString() || null,
    bouncedAt: contact.bouncedAt?.toISOString() || null,
    complainedAt: contact.complainedAt?.toISOString() || null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  }));

  return <main className="space-y-7 pb-20">
    <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 md:flex-row md:items-center">
      <div className="flex items-center gap-4"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Mail className="h-6 w-6" /></div><div><h1 className="text-xl font-bold">Email Operations</h1><p className="mt-1 text-xs text-muted-foreground">{providerLabel} marketing control centre</p></div></div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-700"><ShieldCheck className="h-3.5 w-3.5" /> {providerLabel} · {mode}</span>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[['Contacts', contacts], ['Sequence emails', steps.length], ['Deliveries', deliveries], ['Provider events', events]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-soft"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}
    </div>
    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm leading-relaxed"><strong>The channel cutover is active.</strong> Existing Flodesk contacts remain there. New contacts receive a branded Sure Imports confirmation through Hostinger and are not eligible until they explicitly confirm.</div>
    <EmailOperations steps={steps} provider={provider} />
    <EmailRecords contacts={contactRows} steps={steps} sequenceName={sequence?.name || null} />
  </main>;
}
