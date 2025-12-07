'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  X, Package, Truck, CheckCircle2, Clock, CreditCard,
  MapPin, Phone, User, Calendar, Hash, DollarSign,
  AlertTriangle, Loader2, ShoppingBag
} from 'lucide-react';

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

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: GroupedOrder;
  onStatusUpdate: () => void;
  store: 'main' | 'faya';
}

const STATUS_OPTIONS = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: any }> = {
  PAID: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CreditCard },
  PROCESSING: { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Clock },
  SHIPPED: { color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Truck },
  DELIVERED: { color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: Package },
  COMPLETED: { color: 'text-teal-600', bgColor: 'bg-teal-100 dark:bg-teal-900/30', icon: CheckCircle2 },
};

export default function OrderDetailsModal({ isOpen, onClose, order, onStatusUpdate, store }: OrderDetailsModalProps) {
  const [newStatus, setNewStatus] = useState(order.status);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [trackingCompany, setTrackingCompany] = useState(order.trackingCompany || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!isOpen) return null;

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleUpdateStatus = async () => {
    if (newStatus === order.status && !trackingNumber && !trackingCompany) {
      toast.info('No changes to update');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/store-sales/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId, // Use orderId (ext1) instead of pidStore
          newStatus,
          trackingNumber: trackingNumber || null,
          trackingCompany: trackingCompany || null,
          store,
        }),
      });

      const data = await response.json();

      if (data.statusx === 'SUCCESS') {
        toast.success(`Order status updated to ${newStatus}`);
        setShowConfirmation(false);
        onStatusUpdate();
        onClose();
      } else {
        toast.error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.PAID;
  const StatusIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative inline-block w-full max-w-3xl p-6 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg ${currentConfig.bgColor}`}>
                <StatusIcon className={`w-6 h-6 ${currentConfig.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Order Details</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono" title={order.orderId}>
                  {order.orderId.length > 30 ? `${order.orderId.slice(0, 30)}...` : order.orderId}
                </p>
                {order.items.length > 1 && (
                  <span className="inline-flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded mt-1">
                    <ShoppingBag className="w-3 h-3" /> {order.items.length} items
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Order Info */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Customer Information
                  {store === 'main' && <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">From User Account</span>}
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-medium text-gray-900 dark:text-white">{order.fullName || 'N/A'}</span></p>
                  {order.userEmail && (
                    <p className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium text-gray-900 dark:text-white">{order.userEmail}</span></p>
                  )}
                  <p className="flex justify-between"><span className="text-gray-500">Phone:</span><span className="font-medium text-gray-900 dark:text-white">{order.phone || 'N/A'}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">User ID:</span><span className="font-mono text-xs text-gray-600 dark:text-gray-400">{order.pidUser}</span></p>
                </div>
              </div>

              {/* Order Items - Multi-product display */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Order Items ({order.items.length})
                </h4>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={item.pidStore} className={`text-sm ${index > 0 ? 'border-t border-gray-200 dark:border-gray-700 pt-3' : ''}`}>
                      <p className="text-gray-900 dark:text-white font-medium mb-1">{item.product_name}</p>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Qty: {item.quantity}</span>
                        <span>{formatCurrency(item.unit_price)} × {item.quantity}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{formatCurrency(item.total_price)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-300 dark:border-gray-600 pt-3 mt-3">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">Order Total ({order.totalQuantity} items):</span>
                    <span className="font-bold text-lg text-purple-600">{formatCurrency(order.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Shipping & Status */}
            <div className="space-y-6">
              {/* Shipping Address */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Shipping Address
                  {store === 'main' && order.address && (
                    <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">From User Account</span>
                  )}
                </h4>
                {order.address ? (
                  <>
                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{order.address}</p>
                    {store === 'faya' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm">
                        <p className="flex justify-between"><span className="text-gray-500">Delivery Option:</span><span className="font-medium">{order.deliveryOption || 'Standard'}</span></p>
                        <p className="flex justify-between"><span className="text-gray-500">Location:</span><span className="font-medium">{order.deliveryLocation || 'N/A'}</span></p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No shipping address on file.
                  </p>
                )}
              </div>

              {/* Order Meta */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Order Information
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-gray-500">Order Date:</span><span className="font-medium">{formatDate(order.createdAt)}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Last Updated:</span><span className="font-medium">{formatDate(order.updatedAt)}</span></p>
                  <p className="flex justify-between"><span className="text-gray-500">Purchase Type:</span><span className="font-medium">{order.purchaseType || 'Single'}</span></p>
                </div>
              </div>

              {/* Current Status */}
              <div className={`rounded-lg p-4 ${currentConfig.bgColor}`}>
                <div className="flex items-center gap-3">
                  <StatusIcon className={`w-8 h-8 ${currentConfig.color}`} />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Current Status</p>
                    <p className={`text-lg font-bold ${currentConfig.color}`}>{order.status}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Update Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Update Order Status</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Status Selection */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Tracking Number (for SHIPPED) */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Tracking Company */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Carrier/Company</label>
                <input
                  type="text"
                  value={trackingCompany}
                  onChange={(e) => setTrackingCompany(e.target.value)}
                  placeholder="e.g., DHL, FedEx"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={isUpdating}
                className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Update Status
              </button>
            </div>
          </div>

          {/* Confirmation Modal */}
          {showConfirmation && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-500" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Status Update</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to update the order status from <strong>{order.status}</strong> to <strong>{newStatus}</strong>?
                  {newStatus !== order.status && ' An email notification will be sent to the customer.'}
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={isUpdating}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
