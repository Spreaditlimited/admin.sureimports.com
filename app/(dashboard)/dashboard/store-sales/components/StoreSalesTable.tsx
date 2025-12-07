'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Eye, Search, X, Filter, Package, Truck, CheckCircle2, Clock, CreditCard, Store, ShoppingBag } from 'lucide-react';
import Modal from '@/app/uix/ModalLarge';
import OrderDetailsModal from './OrderDetailsModal';

// Interface for individual product items
interface ProductItem {
  pidStore: string;
  pidProduct: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  total_price: string;
}

// Interface for grouped order (from API)
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

type StoreType = 'main' | 'faya';

export default function StoreSalesTable() {
  const [orders, setOrders] = useState<GroupedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Store type state - default to 'main' (Main Store)
  const [activeStore, setActiveStore] = useState<StoreType>('main');

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

  // Fetch store sales (grouped orders)
  const fetchStoreSales = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        store: activeStore,
        ...(search && { search }),
        ...(status && { status }),
      });

      const response = await fetch(`/api/store-sales?${params}`);
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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch store sales. Please try again.');
      console.error('Fetch error:', err);
      toast.error('Failed to fetch store sales');
      setOrders([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, itemsPerPage, search, status, activeStore]);

  // Handle store type change
  const handleStoreChange = (newStore: StoreType) => {
    setActiveStore(newStore);
    setPage(1);
    setSearch('');
    setStatus('');
  };

  // Debounced fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchStoreSales();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchStoreSales]);

  // Handle details button click
  const handleDetailsClick = (order: GroupedOrder) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  // Handle status update success
  const handleStatusUpdateSuccess = () => {
    fetchStoreSales();
  };

  // Handle filter change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Handle items per page change
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setPage(1);
  };

  // Format currency
  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(num);
  };

  // Get order items display text
  const getOrderItemsDisplay = (items: ProductItem[]) => {
    if (!items || items.length === 0) return 'No items';
    if (items.length === 1) return items[0].product_name;
    return `${items.length} items`;
  };

  // Format date
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

  // Get status badge color and icon
  const getStatusConfig = (status: string | null) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: CreditCard };
      case 'PROCESSING':
        return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: Clock };
      case 'SHIPPED':
        return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', icon: Truck };
      case 'DELIVERED':
        return { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300', icon: Package };
      case 'COMPLETED':
        return { color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300', icon: CheckCircle2 };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300', icon: Package };
    }
  };

  return (
    <div className="space-y-4">
      {/* Store Type Switcher */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow">
        <div className="flex gap-2">
          <button
            onClick={() => handleStoreChange('main')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeStore === 'main'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Store className="w-5 h-5" />
            <span>Main Store</span>
          </button>
          <button
            onClick={() => handleStoreChange('faya')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeStore === 'faya'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>Faya Store</span>
          </button>
        </div>
      </div>

      {/* Total Amount Summary */}
      {!loading && !error && (
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 p-6 rounded-lg shadow-lg">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <p className="text-purple-100 text-sm font-medium mb-1">
                {activeStore === 'main' ? 'Main Store' : 'Faya Store'} Sales {status && `(${status})`}
              </p>
              <p className="text-white text-3xl font-bold">
                {formatCurrency(totalAmount.toString())}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 text-purple-100">
              <div className="text-center sm:text-right">
                <p className="text-xs font-medium mb-1">Total Orders</p>
                <p className="text-xl font-semibold text-white">{totalCount}</p>
              </div>
              {status && (
                <div className="text-center sm:text-right">
                  <p className="text-xs font-medium mb-1">Status</p>
                  <p className="text-xl font-semibold text-white">{status}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by Order ID, name, phone..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {search && (
                <button
                  onClick={() => handleFilterChange(setSearch, '')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(s => s).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Items per page */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Items per page
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Data Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={order.orderId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-mono text-gray-900 dark:text-white truncate max-w-[150px] block" title={order.orderId}>
                            {order.orderId.length > 20 ? `${order.orderId.slice(0, 20)}...` : order.orderId}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{order.fullName || 'N/A'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.phone || order.userEmail || 'No contact'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white max-w-[200px] truncate" title={order.items.map(i => i.product_name).join(', ')}>
                            {getOrderItemsDisplay(order.items)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Qty: {order.totalQuantity}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalPrice)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDetailsClick(order)}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {((page - 1) * itemsPerPage) + 1} to {Math.min(page * itemsPerPage, totalCount)} of {totalCount} results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Previous
                </button>
                <span className="px-4 py-1 text-sm font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          order={selectedOrder}
          onStatusUpdate={handleStatusUpdateSuccess}
          store={activeStore}
        />
      )}
    </div>
  );
}

