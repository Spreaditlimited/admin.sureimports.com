'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, XCircle, Loader2, Wallet } from 'lucide-react';

interface PayoutRequest {
  id: number;
  pidPayout: string;
  pidUser: string | null;
  amount: number | null;
  recipient: string | null;
  reference: string | null;
  reason: string | null;
  status: string | null;
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPayouts: PayoutRequest[];
  onSuccess: () => void;
}

interface BalanceData {
  available: number;
  currency: string;
}

interface TransferResult {
  pidPayout: string;
  success: boolean;
  message: string;
  transfer_code?: string;
}

export default function ApprovalModal({
  isOpen,
  onClose,
  selectedPayouts,
  onSuccess,
}: ApprovalModalProps) {
  const [passcode, setPasscode] = useState('');
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<TransferResult[] | null>(null);

  const calculateServiceCharge = (amount: number): number => {
    const twoPercent = amount * 0.02;
    return Math.min(twoPercent, 2500); // Standardized to ₦2,500 cap
  };

  const totalAmount = selectedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalServiceCharge = selectedPayouts.reduce((sum, p) => {
    const amount = p.amount || 0;
    return sum + calculateServiceCharge(amount);
  }, 0);
  const totalNetTransfer = totalAmount - totalServiceCharge;

  useEffect(() => {
    if (isOpen) {
      checkBalance();
      setPasscode('');
      setResults(null);
    }
  }, [isOpen]);

  const checkBalance = async () => {
    setCheckingBalance(true);
    setBalanceError(null);
    try {
      const response = await fetch('/api/payout-requests/check-balance', { method: 'POST' });
      const data = await response.json();
      if (data.success) setBalance(data.balance);
      else setBalanceError(data.message || 'Failed to check balance');
    } catch (error) {
      setBalanceError('Connection error');
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleApprove = async () => {
    if (!passcode) return toast.error('Admin passcode required');
    if (!balance || balance.available < totalNetTransfer) return toast.error('Insufficient Paystack balance');

    setProcessing(true);
    try {
      const response = await fetch('/api/payout-requests/approve-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutIds: selectedPayouts.map(p => p.pidPayout), passcode }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
        const failCount = data.results.filter((r: any) => !r.success).length;
        if (failCount === 0) toast.success(`All transfers completed successfully`);
        else toast.warning(`Batch completed with ${failCount} failures`);
        setTimeout(onSuccess, 2000);
      } else {
        toast.error(data.message || 'Processing failed');
      }
    } catch (error) {
      toast.error('System error during processing');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-card border border-border rounded-xl shadow-soft max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold tracking-tight text-foreground">Approve Bulk Payout</h3>
            <p className="text-xs font-medium text-muted-foreground">Review batch settlement before processing</p>
          </div>
          <button onClick={onClose} disabled={processing} className="p-2 rounded-md hover:bg-muted text-muted-foreground disabled:opacity-50">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Balance Overview Card */}
          <div className="bg-muted/30 border border-border rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full text-primary">
                <Wallet className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Paystack Available Balance</span>
                {checkingBalance ? (
                  <div className="flex items-center gap-2 mt-1 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Checking...
                  </div>
                ) : balanceError ? (
                  <div className="flex items-center gap-2 mt-1 text-sm text-destructive font-bold">
                    <AlertCircle className="w-4 h-4" /> {balanceError}
                    <button onClick={checkBalance} className="ml-2 underline underline-offset-4">Retry</button>
                  </div>
                ) : balance && (
                  <div className="mt-1">
                    <p className="text-3xl font-bold text-foreground">{formatCurrency(balance.available)}</p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Gross Total</span>
                            <span className="text-sm font-semibold">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-orange-600 uppercase">Service Fees (2%)</span>
                            <span className="text-sm font-semibold">-{formatCurrency(totalServiceCharge)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-primary uppercase">Net Settlement</span>
                            <span className="text-sm font-bold text-foreground underline underline-offset-4 decoration-primary">{formatCurrency(totalNetTransfer)}</span>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        {balance.available >= totalNetTransfer ? (
                          <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-md border border-emerald-500/20 w-fit">
                            <CheckCircle className="w-3.5 h-3.5" /> Sufficient funds available for batch payout
                          </p>
                        ) : (
                          <p className="text-xs font-bold text-destructive flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 rounded-md border border-destructive/20 w-fit">
                            <XCircle className="w-3.5 h-3.5" /> Insufficient balance (Short by {formatCurrency(totalNetTransfer - balance.available)})
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payout Table */}
          {!results && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-foreground">Selected Batch Items ({selectedPayouts.length})</h4>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3 text-right">Original</th>
                      <th className="px-4 py-3 text-right">Net To Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedPayouts.map((payout) => {
                      const net = (payout.amount || 0) - calculateServiceCharge(payout.amount || 0);
                      return (
                        <tr key={payout.pidPayout} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-muted-foreground">{payout.pidPayout}</td>
                          <td className="px-4 py-3 font-semibold truncate max-w-[200px]">{payout.recipient}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground line-through decoration-destructive/30">{formatCurrency(payout.amount || 0)}</td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">{formatCurrency(net)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results Table */}
          {results && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
              <h4 className="text-sm font-bold text-foreground">Execution Results</h4>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {results.map((res) => (
                      <tr key={res.pidPayout}>
                        <td className="px-4 py-3 font-mono">{res.pidPayout}</td>
                        <td className="px-4 py-3">
                          {res.success ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Success</span>
                          ) : (
                            <span className="text-destructive font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{res.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Disclaimer */}
          {!results && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase">Service Charge Protocol</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        A <span className="font-bold text-foreground">2% fee (capped at ₦2,500)</span> applies per transaction. 
                        Customers receive the <span className="font-bold text-foreground">Net Amount</span> in their bank, 
                        while their system wallet is debited the <span className="font-bold text-foreground">Gross Amount</span>.
                    </p>
                </div>
            </div>
          )}

          {/* Verification */}
          {!results && (
            <div className="pt-4 border-t border-border">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Admin Passcode Verification</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-input rounded-md bg-background text-foreground text-sm font-mono tracking-widest focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                disabled={processing}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={processing}
            className="px-5 py-2 text-sm font-bold text-foreground border border-border bg-background rounded-md hover:bg-muted transition-colors disabled:opacity-50"
          >
            {results ? 'Close Modal' : 'Cancel'}
          </button>
          
          {!results && (
            <button
              onClick={handleApprove}
              disabled={processing || !passcode || !balance || balance.available < totalNetTransfer}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-md hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:grayscale flex items-center gap-2"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Executing Batch...</>
              ) : (
                <><CheckCircle className="w-4 h-4" /> Finalize & Pay</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}