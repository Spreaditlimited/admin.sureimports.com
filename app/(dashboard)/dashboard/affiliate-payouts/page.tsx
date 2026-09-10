import { redirect } from 'next/navigation';
import { requireAffiliatePayoutAdmin } from '@/lib/affiliate/adminAuth';
import { listAffiliateConversionsForReview, listAffiliatePayoutOperations } from '@/lib/affiliate/payoutOperations';
import { CommissionReview, PayoutOperations } from './PayoutOperations';

export const dynamic = 'force-dynamic';

export default async function AffiliatePayoutsPage() {
  if (!(await requireAffiliatePayoutAdmin())) redirect('/dashboard');
  const [payouts, conversions] = await Promise.all([listAffiliatePayoutOperations(), listAffiliateConversionsForReview()]);
  return <main className="space-y-7 pb-12">
    <header className="border-b border-border pb-6"><p className="text-[10px] font-bold uppercase tracking-widest text-primary">Affiliate programme</p><h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">Affiliate payouts</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Review reserved commissions and execute NGN transfers through Paystack or USD payouts through PayPal. Currency conversion is never performed.</p></header>
    <div className="grid gap-4 md:grid-cols-3"><article className="rounded-xl border border-border bg-card p-5"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Requested</span><strong className="mt-3 block text-2xl">{payouts.filter((item) => item.status === 'REQUESTED').length}</strong></article><article className="rounded-xl border border-border bg-card p-5"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Processing</span><strong className="mt-3 block text-2xl">{payouts.filter((item) => ['PROCESSING', 'OTP_REQUIRED'].includes(item.status)).length}</strong></article><article className="rounded-xl border border-border bg-card p-5"><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paid</span><strong className="mt-3 block text-2xl">{payouts.filter((item) => item.status === 'PAID').length}</strong></article></div>
    <CommissionReview conversions={conversions} />
    <PayoutOperations payouts={payouts} />
  </main>;
}
