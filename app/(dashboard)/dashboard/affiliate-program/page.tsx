import { redirect } from 'next/navigation';
import { requireAffiliateAdmin } from '@/lib/affiliate/adminAuth';
import { listAffiliateProgramServices } from '@/lib/affiliate/programConfiguration';
import { AffiliateProgramSettings } from './AffiliateProgramSettings';

export const dynamic = 'force-dynamic';

export default async function AffiliateProgramPage() {
  if (!(await requireAffiliateAdmin('view'))) redirect('/dashboard');
  const [services, editor] = await Promise.all([listAffiliateProgramServices(), requireAffiliateAdmin('edit')]);
  return <main className="space-y-7 pb-12"><header className="border-b border-border pb-6"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Affiliate programme</p><h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Programme configuration</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Add or remove eligible services, control commission rules, and define currency-specific fixed rewards. Historical commissions are never recalculated when a rule changes.</p></header><AffiliateProgramSettings services={services} canEdit={Boolean(editor)} /></main>;
}
