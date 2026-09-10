'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Payout = {
  pidPayout: string;
  affiliate: string;
  referralCode: string;
  provider: string;
  currency: string;
  amount: number;
  status: string;
  providerStatus: string | null;
  externalReference: string | null;
  requestedAt: string | Date;
  destination: string;
  itemCount: number;
  failureReason: string | null;
};
type Conversion = {
  pidConversion: string;
  affiliate: string;
  referralCode: string;
  service: string;
  orderReference: string;
  paymentCurrency: string;
  grossAmount: number;
  eligibleAmount: number;
  commissionCurrency: string;
  commissionAmount: number;
  status: string;
  createdAt: string | Date;
  lockedToPayout: boolean;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount);

export function PayoutOperations({ payouts }: { payouts: Payout[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [otpFor, setOtpFor] = useState('');
  const [otp, setOtp] = useState('');

  async function action(pidPayout: string, name: string, body?: Record<string, unknown>) {
    setBusy(`${pidPayout}:${name}`);
    setError('');
    try {
      const response = await fetch(`/api/affiliate-payouts/${encodeURIComponent(pidPayout)}/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Payout action failed.');
      setOtpFor(''); setOtp(''); router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Payout action failed.');
    } finally {
      setBusy('');
    }
  }

  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    {error ? <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-semibold text-destructive">{error}</div> : null}
    <div className="overflow-x-auto">
      <table className="w-full min-w-[78rem] text-left text-sm">
        <thead className="border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><tr><th className="px-5 py-4">Request</th><th className="px-5 py-4">Affiliate</th><th className="px-5 py-4">Destination</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Actions</th></tr></thead>
        <tbody className="divide-y divide-border">{payouts.length ? payouts.map((payout) => <tr key={payout.pidPayout} className="align-top">
          <td className="px-5 py-4"><strong className="font-mono text-xs">{payout.pidPayout}</strong><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(payout.requestedAt))} · {payout.itemCount} commission(s)</p></td>
          <td className="px-5 py-4"><strong>{payout.affiliate}</strong><p className="mt-1 font-mono text-xs text-muted-foreground">{payout.referralCode}</p></td>
          <td className="px-5 py-4"><strong>{payout.provider}</strong><p className="mt-1 text-xs text-muted-foreground">{payout.destination}</p></td>
          <td className="px-5 py-4 font-bold">{money(payout.amount, payout.currency)}</td>
          <td className="px-5 py-4"><span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase">{payout.status.replaceAll('_', ' ')}</span>{payout.providerStatus ? <p className="mt-2 text-xs text-muted-foreground">Provider: {payout.providerStatus}</p> : null}{payout.failureReason ? <p className="mt-2 max-w-xs text-xs text-destructive">{payout.failureReason}</p> : null}</td>
          <td className="px-5 py-4"><div className="flex max-w-sm flex-wrap gap-2">
            {(payout.status === 'REQUESTED' || (payout.status === 'FAILED' && !payout.externalReference)) ? <button className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50" disabled={Boolean(busy)} onClick={() => action(payout.pidPayout, 'execute')}>{busy === `${payout.pidPayout}:execute` ? 'Starting…' : payout.status === 'FAILED' ? 'Retry payout' : 'Approve & pay'}</button> : null}
            {(['PROCESSING', 'OTP_REQUIRED'].includes(payout.status) || (payout.status === 'FAILED' && Boolean(payout.externalReference))) ? <button className="rounded-md border border-border px-3 py-2 text-xs font-bold disabled:opacity-50" disabled={Boolean(busy)} onClick={() => action(payout.pidPayout, 'reconcile')}>Check provider</button> : null}
            {['REQUESTED', 'FAILED'].includes(payout.status) ? <button className="rounded-md border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive disabled:opacity-50" disabled={Boolean(busy)} onClick={() => action(payout.pidPayout, 'cancel')}>Cancel</button> : null}
            {payout.status === 'OTP_REQUIRED' ? <button className="rounded-md border border-border px-3 py-2 text-xs font-bold" onClick={() => setOtpFor(payout.pidPayout)}>Enter OTP</button> : null}
          </div>{otpFor === payout.pidPayout ? <div className="mt-3 flex gap-2"><input className="w-28 rounded-md border border-input bg-background px-3 py-2 text-xs" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="Paystack OTP" /><button className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground" onClick={() => action(payout.pidPayout, 'otp', { otp })}>Confirm</button></div> : null}</td>
        </tr>) : <tr><td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">No affiliate payout requests yet.</td></tr>}</tbody>
      </table>
    </div>
  </section>;
}

export function CommissionReview({ conversions }: { conversions: Conversion[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function review(pidConversion: string, decision: 'AVAILABLE' | 'VOIDED') {
    setBusy(`${pidConversion}:${decision}`); setError('');
    try {
      const response = await fetch(`/api/affiliate-conversions/${encodeURIComponent(pidConversion)}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Commission review failed.');
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Commission review failed.');
    } finally { setBusy(''); }
  }
  return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
    <header className="border-b border-border bg-muted/20 p-6"><h2 className="text-xl font-black">Commission review</h2><p className="mt-1 text-sm text-muted-foreground">Confirm eligible commissions before affiliates can request payout.</p></header>
    {error ? <div className="border-b border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-semibold text-destructive">{error}</div> : null}
    <div className="overflow-x-auto"><table className="w-full min-w-[76rem] text-left text-sm"><thead className="border-b border-border bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><tr><th className="px-5 py-4">Commission</th><th className="px-5 py-4">Affiliate</th><th className="px-5 py-4">Service</th><th className="px-5 py-4">Eligible payment</th><th className="px-5 py-4">Commission</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Review</th></tr></thead>
      <tbody className="divide-y divide-border">{conversions.length ? conversions.map((item) => <tr key={item.pidConversion}><td className="px-5 py-4"><strong className="font-mono text-xs">{item.pidConversion}</strong><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(item.createdAt))}</p></td><td className="px-5 py-4"><strong>{item.affiliate}</strong><p className="mt-1 font-mono text-xs text-muted-foreground">{item.referralCode}</p></td><td className="px-5 py-4"><strong>{item.service}</strong><p className="mt-1 max-w-52 truncate text-xs text-muted-foreground">{item.orderReference}</p></td><td className="px-5 py-4">{money(item.eligibleAmount, item.paymentCurrency)}</td><td className="px-5 py-4 font-bold">{money(item.commissionAmount, item.commissionCurrency)}</td><td className="px-5 py-4"><span className="rounded-md bg-muted px-2 py-1 text-[10px] font-bold uppercase">{item.status}</span></td><td className="px-5 py-4"><div className="flex gap-2">{item.status === 'PENDING' ? <button className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50" disabled={Boolean(busy)} onClick={() => review(item.pidConversion, 'AVAILABLE')}>Approve</button> : null}{['PENDING', 'AVAILABLE'].includes(item.status) && !item.lockedToPayout ? <button className="rounded-md border border-destructive/30 px-3 py-2 text-xs font-bold text-destructive disabled:opacity-50" disabled={Boolean(busy)} onClick={() => review(item.pidConversion, 'VOIDED')}>Void</button> : null}</div></td></tr>) : <tr><td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">No commissions awaiting review.</td></tr>}</tbody>
    </table></div>
  </section>;
}
