'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  Eye, 
  Search, 
  X, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  RefreshCw, 
  Filter, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  User as UserIcon,
  Calendar
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

// [Interfaces perfectly preserved from your original codebase]
interface ProductItem {
  pidStore: string;
  pidProduct: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

interface GroupedOrder {
  orderId: string;
  pidUser: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: ProductItem[];
  totalQuantity: number;
  totalPrice: number;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  deliveryOption?: string | null;
  deliveryLocation?: string | null;
  userEmail?: string | null;
  activeTab?: string | null;
  purchaseType?: string | null;
  trackingNumber?: string | null;
  trackingCompany?: string | null;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const STATUS_OPTIONS = ['', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

export default function StoreSalesTable() {
  const [orders, setOrders] = useState<GroupedOrder[]>([]);
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
  const [status, setStatus] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<GroupedOrder | null>(null);

  const fetchStoreSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(search && { search }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/store-sales?${params.toString()}`);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Store sales API error (${response.status}): ${errorText.slice(0, 180)}`);
      }

      if (!contentType.toLowerCase().includes('application/json')) {
        const bodyPreview = await response.text();
        throw new Error(`Unexpected API response format: ${bodyPreview.slice(0, 180)}`);
      }

      const data = await response.json();

      if (data.statusx === 'SUCCESS') {
        setOrders(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.totalCount || 0);
        setTotalAmount(data.totalAmount || 0);
      } else {
        setError(data.message || 'Failed to fetch store sales');
        toast.error(data.message || 'Failed to fetch store sales');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error
        ? err.message
        : (typeof err === 'string' ? err : 'Failed to fetch store sales. Please try again.');

      setError(errorMessage);
      toast.error('Failed to fetch store sales');
      setOrders([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, search, status]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchStoreSales();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchStoreSales]);

  const handleDetailsClick = (order: GroupedOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleStatusUpdateSuccess = () => {
    fetchStoreSales();
  };

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setPage(1);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return '₦0.00';
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(num);
  };

  const getOrderItemsDisplay = (items: ProductItem[]) => {
    if (!items || items.length === 0) return 'No items provisioned';
    if (items.length === 1) return items[0].product_name;
    return `${items.length} Distinct Items`;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CreditCard };
      case 'PROCESSING':
        return { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock };
      case 'SHIPPED':
        return { color: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck };
      case 'DELIVERED':
        return { color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: Package };
      case 'COMPLETED':
        return { color: 'bg-teal-500/10 text-teal-600 border-teal-500/20', icon: CheckCircle2 };
      default:
        return { color: 'bg-muted text-muted-foreground border-border', icon: Package };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Fiscal Performance Ledger Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cumulative Gross Revenue</p>
              <p className="text-2xl font-bold mt-1 text-foreground font-mono">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fulfillment Invoices</p>
              <p className="text-2xl font-bold mt-1 text-foreground font-mono">{totalCount}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-soft flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ledger Node Scope</p>
              <p className="text-2xl font-bold mt-1 text-foreground font-mono">{status || 'ALL SEGMENTS'}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted text-muted-foreground">
              <Filter className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* 2. Calibration Workspace Controls */}
      <div className="bg-card border border-border rounded-xl shadow-soft p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Query String Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Search className="w-3 h-3" /> Query String Analysis
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search by Invoice, Subscriber name..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-background border border-border rounded-lg text-xs font-medium text-foreground focus:ring-2 focus:ring-primary/20 transition-all"
              />
              {search && (
                <button
                  onClick={() => handleFilterChange(setSearch, '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Core Lifecycle Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Core Lifecycle Stage</label>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold uppercase tracking-widest text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20"
            >
              <option value="">All Lifecycle Nodes</option>
              {STATUS_OPTIONS.filter(s => s).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Matrix Window Quantum */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Matrix Window Quantum</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-bold font-mono text-foreground cursor-pointer focus:ring-2 focus:ring-primary/20"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} Entries / View</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Operational Data Matrix */}
      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Synchronizing Ledger Operations...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs font-bold uppercase tracking-wider text-destructive bg-destructive/5 border-b border-border">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Transaction URI</th>
                  <th className="px-6 py-4">Subscriber Spec</th>
                  <th className="px-6 py-4">Consolidated Cargo</th>
                  <th className="px-6 py-4">Total Price</th>
                  <th className="px-6 py-4">Fulfillment Status</th>
                  <th className="px-6 py-4">Timestamp Node</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground italic">
                      No matching records committed to database.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={order.orderId} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[140px] block" title={order.orderId}>
                            {order.orderId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground flex items-center gap-1.5">
                            <UserIcon className="w-3 h-3 text-muted-foreground" /> {order.fullName || 'Unidentified'}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{order.phone || order.userEmail || 'No contact string'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground max-w-[180px] truncate" title={order.items.map(i => i.product_name).join(', ')}>
                            {getOrderItemsDisplay(order.items)}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Quantity Mass: {order.totalQuantity} units</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-semibold text-foreground font-mono">
                          {formatCurrency(order.totalPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${statusConfig.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-[10px]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" /> {formatDate(order.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDetailsClick(order)}
                            className="inline-flex items-center px-3 py-1.5 bg-background border border-border text-foreground rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-muted shadow-sm transition-all"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-primary" /> View Specs
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Ledger Pagination Matrix */}
        {totalPages > 1 && !loading && !error && (
          <div className="px-6 py-4 border-t border-border bg-muted/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
            <p className="text-muted-foreground">
              Indexing <span className="text-foreground">{((page - 1) * itemsPerPage) + 1} - {Math.min(page * itemsPerPage, totalCount)}</span> of <span className="text-foreground">{totalCount}</span> Transactions
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(1)}
                disabled={page === 1}
                className="p-2 border border-border bg-card hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                First
              </button>
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 border border-border bg-card hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1.5 font-mono text-foreground bg-background rounded-lg border border-border">
                Node {page} / {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 border border-border bg-card hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={page === totalPages}
                className="p-2 border border-border bg-card hover:bg-muted rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          order={selectedOrder}
          onStatusUpdate={handleStatusUpdateSuccess}
          store="main"
        />
      )}
    </div>
  );
}
