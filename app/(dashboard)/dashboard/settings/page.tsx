import Link from 'next/link';
import { BadgeDollarSign, Landmark, Ship, UserCog } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { isSuperAdminStatus } from '@/lib/accessControl';

export default async function SettingsPage() {
  const token = (await cookies()).get('token')?.value;
  const payload = token ? verifyToken(token) as { pidUser?: string } | null : null;
  if (!payload?.pidUser) redirect('/auth/login');
  const admin = await prisma.admin.findUnique({
    where: { pidUser: payload.pidUser },
    select: { userStatus: true, permissions: { where: { serviceKey: 'system_settings', canView: true }, select: { id: true } } },
  });
  if (!admin) redirect('/auth/login');
  if (!isSuperAdminStatus(admin.userStatus) && admin.permissions.length === 0) redirect('/dashboard');

  const sections = [
    { title: 'Admin Management', description: 'Manage administrators, access levels and permissions.', href: '/dashboard/admin/view', icon: UserCog },
    { title: 'Shipping Plans', description: 'Configure shipping plans, units and destination pricing.', href: '/dashboard/shipping-plans/add', icon: Ship },
    { title: 'Exchange & Rates', description: 'Manage exchange rates, service charges and VAT.', href: '/dashboard/exchange-rates', icon: BadgeDollarSign },
    { title: 'Bank Accounts', description: 'Manage the bank accounts shown on customer invoices.', href: '/dashboard/invoicing/bank-accounts', icon: Landmark },
  ];
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h1>
        <p className="text-sm text-muted-foreground">Manage team access, logistics and financial configuration.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.title} href={section.href} className="rounded-xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40">
            <section.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-4 font-bold">{section.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
