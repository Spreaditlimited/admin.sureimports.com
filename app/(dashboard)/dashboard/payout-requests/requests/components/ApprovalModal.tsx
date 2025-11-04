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
  const [loading, setLoading] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<TransferResult[] | null>(null);

  // Calculate service charge (2% capped at ₦2,000)
  const calculateServiceCharge = (amount: number): number => {
    const twoPercent = amount * 0.02;
    return Math.min(twoPercent, 2000); // Cap at ₦2,000
  };

  const totalAmount = selectedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalServiceCharge = selectedPayouts.reduce((sum, p) => {
    const amount = p.amount || 0;
    return sum + calculateServiceCharge(amount);
  }, 0);
  const totalNetTransfer = totalAmount - totalServiceCharge;

  // Check balance when modal opens
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
      const response = await fetch('/api/payout-requests/check-balance', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setBalance(data.balance);
      } else {
        setBalanceError(data.message || 'Failed to check balance');
        toast.error('Failed to check balance');
      }
    } catch (error: any) {
      setBalanceError('Failed to connect to Paystack');
      toast.error('Failed to check balance');
      console.error('Balance check error:', error);
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleApprove = async () => {
    if (!passcode) {
      toast.error('Please enter admin passcode');
      return;
    }

    // Check balance against net transfer amount (what will actually be sent)
    if (!balance || balance.available < totalNetTransfer) {
      toast.error('Insufficient balance for net transfer amount');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/payout-requests/approve-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payoutIds: selectedPayouts.map((p) => p.pidPayout),
          passcode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        const successCount = data.results.filter((r: TransferResult) => r.success).length;
        const failCount = data.results.length - successCount;

        if (failCount === 0) {
          toast.success(`All ${successCount} transfers completed successfully!`);
        } else {
          toast.warning(`${successCount} successful, ${failCount} failed`);
        }

        // Refresh the table after a short delay
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        toast.error(data.message || 'Failed to process transfers');
        setResults(null);
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      toast.error('Failed to process transfers');
      setResults(null);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handleClose = () => {
    if (!processing) {
      onClose();
      setTimeout(() => {
        setPasscode('');
        setResults(null);
        setBalance(null);
        setBalanceError(null);
      }, 300);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900 bg-opacity-75">
      <div className="w-full max-w-4xl mx-4 rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Approve Bulk Payout
          </h3>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            onClick={handleClose}
            disabled={processing}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Balance Check */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Available Balance
              </h4>
              {checkingBalance ? (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking balance...</span>
                </div>
              ) : balanceError ? (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span>{balanceError}</span>
                  <button
                    onClick={checkBalance}
                    className="ml-2 text-sm underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              ) : balance ? (
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(balance.available)}
                  </p>
                  <div className="mt-2 text-sm space-y-1">
                    <p className="text-gray-600 dark:text-gray-400">
                      Original amount: <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </p>
                    <p className="text-orange-600 dark:text-orange-400">
                      Service charge (2%): <span className="font-semibold">-{formatCurrency(totalServiceCharge)}</span>
                    </p>
                    <p className="text-gray-900 dark:text-white text-base font-bold border-t border-gray-300 dark:border-gray-600 pt-1">
                      Net transfer amount: <span>{formatCurrency(totalNetTransfer)}</span>
                    </p>
                    {balance.available >= totalNetTransfer ? (
                      <p className="text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-4 h-4" />
                        Sufficient balance available
                      </p>
                    ) : (
                      <p className="text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                        <XCircle className="w-4 h-4" />
                        Insufficient balance (Short by {formatCurrency(totalNetTransfer - balance.available)})
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Selected Payouts List */}
        {!results && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Selected Payouts ({selectedPayouts.length})
            </h4>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Payout ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Recipient
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Original
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Service Charge
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Net Transfer
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedPayouts.map((payout) => {
                    const originalAmount = payout.amount || 0;
                    const serviceCharge = calculateServiceCharge(originalAmount);
                    const netAmount = originalAmount - serviceCharge;

                    return (
                      <tr key={payout.pidPayout}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                          {payout.pidPayout}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {payout.recipient || 'N/A'}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(originalAmount)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right text-orange-600 dark:text-orange-400">
                          -{formatCurrency(serviceCharge)}
                        </td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(netAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <td colSpan={2} className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">
                      Total
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalAmount)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-orange-600 dark:text-orange-400">
                      -{formatCurrency(totalServiceCharge)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right font-bold text-gray-900 dark:text-white">
                      {formatCurrency(totalNetTransfer)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Transfer Results
            </h4>
            <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Payout ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result) => (
                    <tr key={result.pidPayout}>
                      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                        {result.pidPayout}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {result.success ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                        {result.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Service Charge Notice */}
        {!results && (
          <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-200 mb-1">
                  Service Charge Applied
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  A 2% service charge (capped at ₦2,000 per transaction) will be deducted from each payout.
                  Users will receive the net transfer amount in their bank accounts, while the full original
                  amount will be debited from their wallets.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Passcode Input */}
        {!results && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Passcode <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode"
              disabled={processing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={processing}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {results ? 'Close' : 'Cancel'}
          </button>
          {!results && (
            <button
              type="button"
              onClick={handleApprove}
              disabled={
                processing ||
                !passcode ||
                !balance ||
                balance.available < totalAmount ||
                checkingBalance
              }
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Payment
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

