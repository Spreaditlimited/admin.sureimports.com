'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Eye, Search, CheckCircle, RefreshCw } from 'lucide-react';
import Modal from '@/app/uix/ModalLarge';
import ApprovalModal from './ApprovalModal';

interface PayoutRequest {
  id: number;
  pidPayout: string;
  pidUser: string | null;
  amount: number | null;
  recipient: string | null;
  reference: string | null;
  reason: string | null;
  status: string | null;
  xStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface UserDetails {
  pidUser: string;
  userFirstname: string | null;
  userLastname: string | null;
  userEmail: string;
  userPhone: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_code: string | null;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function PayoutRequestsTable() {
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  // Filter state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Pending');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Selection state
  const [selectedPayouts, setSelectedPayouts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const fetchPayoutRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/payout-requests?${params}`);
      const data = await response.json();

      if (data.statusx === 'SUCCESS') {
        setPayoutRequests(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        setTotalAmount(data.totalAmount || 0);
      } else {
        setError(data.message || 'Failed to fetch payout requests');
      }
    } catch (err: any) {
      setError('Connection error. Please try again.');
      setPayoutRequests([]);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, search, status]);

  useEffect(() => {
    const handler = setTimeout(fetchPayoutRequests, 300);
    return () => clearTimeout(handler);
  }, [fetchPayoutRequests]);

  const fetchUserDetails = async (pidUser: string) => {
    setLoadingUser(true);
    try {
      const response = await fetch(`/api/get-data/user-one?pidUser=${pidUser}`);
      const data = await response.json();
      if (data) setUserDetails(data);
    } catch (err) {
      toast.error('User details unavailable');
    } finally {
      setLoadingUser(false);
    }
  };

  const handleDetailsClick = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setUserDetails(null);
    setIsModalOpen(true);
    if (payout.pidUser) fetchUserDetails(payout.pidUser);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPayout(null);
    setUserDetails(null);
  };

  const handleSelectPayout = (pidPayout: string, isChecked: boolean) => {
    const newSelected = new Set(selectedPayouts);
    if (isChecked) {
      newSelected.add(pidPayout);
    } else {
      newSelected.delete(pidPayout);
    }
    setSelectedPayouts(newSelected);
    setSelectAll(false);
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const pending = payoutRequests.filter(p => p.status?.toLowerCase() === 'pending').map(p => p.pidPayout);
      setSelectedPayouts(new Set(pending));
      setSelectAll(true);
    } else {
      setSelectedPayouts(new Set());
      setSelectAll(false);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  };

  const handleApprovalSuccess = () => {
    setSelectedPayouts(new Set());
    setSelectAll(false);
    fetchPayoutRequests();
  };

  const selectedTotalAmount = payoutRequests
    .filter(p => selectedPayouts.has(p.pidPayout))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string | null) => {
    const s = status?.toLowerCase() || '';
    let style = 'bg-muted text-muted-foreground border-border';
    if (s === 'pending') style = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    else if (s === 'paid') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    else if (s === 'cancelled') style = 'bg-destructive/10 text-destructive border-destructive/20';

    return (
      <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full border uppercase tracking-wider ${style}`}>
        {status || 'N/A'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 bg-card border border-border shadow-soft rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Total Volume {status && `(${status})`}
              </span>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-xs text-muted-foreground">Across {totalCount} total requests</p>
            </div>
            
            {selectedPayouts.size > 0 && (
              <div className="sm:border-l border-border sm:pl-8 space-y-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Selected for Approval ({selectedPayouts.size})
                </span>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(selectedTotalAmount)}
                </p>
                <button
                  onClick={() => setIsApprovalModalOpen(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Batch
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 flex flex-col justify-center items-center text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Queue Status</span>
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-2xl font-bold text-foreground">
                    {payoutRequests.filter(p => p.status?.toLowerCase() === 'pending').length}
                </span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground mt-1">PENDING REQUESTS</span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search by ID, Recipient..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending Only</option>
            <option value="Paid">Completed (Paid)</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setPage(1); }}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} per page</option>)}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                  />
                </th>
                <th className="px-6 py-4">S/N</th>
                <th className="px-6 py-4">Payout ID</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Recipient</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">Fetching payout requests...</p>
                  </td>
                </tr>
              ) : payoutRequests.length > 0 ? (
                payoutRequests.map((payout, index) => {
                  const isPending = payout.status?.toLowerCase() === 'pending';
                  const isSelected = selectedPayouts.has(payout.pidPayout);
                  return (
                    <tr key={payout.pidPayout} className={`transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectPayout(payout.pidPayout, e.target.checked)}
                          disabled={!isPending}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-30"
                        />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{(page - 1) * itemsPerPage + index + 1}</td>
                      <td className="px-6 py-4 font-mono text-xs">{payout.pidPayout}</td>
                      <td className="px-6 py-4 font-bold text-foreground">{formatCurrency(payout.amount)}</td>
                      <td className="px-6 py-4 truncate max-w-[150px]">{payout.recipient || 'N/A'}</td>
                      <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{formatDate(payout.createdAt)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDetailsClick(payout)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border hover:bg-muted text-foreground rounded-md text-xs font-medium transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">No matching payout requests found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1 py-2 text-sm text-muted-foreground">
          <p>
            Showing <span className="font-bold text-foreground">{(page - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-bold text-foreground">{Math.min(page * itemsPerPage, totalCount)}</span> of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4 rotate-180" />
            </button>
            <span className="px-4 font-semibold text-foreground">Page {page} of {totalPages}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-md border border-border bg-card hover:bg-muted disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals remain structurally similar but inherit standard styles via Modal components */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        {selectedPayout && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold tracking-tight text-foreground border-b border-border pb-4">Payout Request Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaction Info</h4>
                    <div className="space-y-3">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Payout ID</span>
                            <span className="text-sm font-semibold text-foreground">{selectedPayout.pidPayout}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Amount Requested</span>
                            <span className="text-base font-bold text-primary">{formatCurrency(selectedPayout.amount)}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Reason/Reference</span>
                            <span className="text-sm text-foreground italic">"{selectedPayout.reason || 'No reason provided'}"</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">User/Bank Account</h4>
                    {loadingUser ? (
                         <div className="flex items-center gap-3 py-4">
                            <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Loading sensitive data...</span>
                         </div>
                    ) : userDetails ? (
                        <div className="space-y-3">
                             <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Full Name</span>
                                <span className="text-sm font-semibold text-foreground">{userDetails.userFirstname} {userDetails.userLastname}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Settlement Bank</span>
                                <span className="text-sm font-semibold text-foreground">{userDetails.bank_name || 'N/A'}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Account Number</span>
                                <span className="text-sm font-mono font-bold text-foreground tracking-widest">{userDetails.bank_account_number || 'N/A'}</span>
                            </div>
                        </div>
                    ) : <span className="text-sm text-destructive">User profile data inaccessible</span>}
                </div>
            </div>
          </div>
        )}
      </Modal>

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        selectedPayouts={payoutRequests.filter(p => selectedPayouts.has(p.pidPayout))}
        onSuccess={handleApprovalSuccess}
      />
    </div>
  );
}
