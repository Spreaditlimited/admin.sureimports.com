'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  X, Package, Truck, CheckCircle2, Clock, CreditCard,
  MapPin, Phone, User, Calendar, Hash, DollarSign,
  AlertTriangle, Loader2, ShoppingBag, Fingerprint, Layers, RefreshCw
} from 'lucide-react';

// [Interfaces preserved from your original codebase]
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

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: GroupedOrder;
  onStatusUpdate: () => void;
  store: 'main';
}

const STATUS_OPTIONS = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

const STATUS_CONFIG: Record<string, { theme: string; icon: any }> = {
  PAID: { theme: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', icon: CreditCard },
  PROCESSING: { theme: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  SHIPPED: { theme: 'bg-purple-500/10 text-purple-600 border-purple-500/20', icon: Truck },
  DELIVERED: { theme: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20', icon: Package },
  COMPLETED: { theme: 'bg-teal-500/10 text-teal-600 border-teal-500/20', icon: CheckCircle2 },
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
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleUpdateStatus = async () => {
    if (newStatus === order.status && !trackingNumber && !trackingCompany) {
      toast.info('No modifications detected.');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch('/api/store-sales/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          newStatus,
          trackingNumber: trackingNumber || null,
          trackingCompany: trackingCompany || null,
          store,
        }),
      });

      const data = await response.json();

      if (data.statusx === 'SUCCESS') {
        toast.success(`Workflow transitioned to ${newStatus}`);
        setShowConfirmation(false);
        onStatusUpdate();
        onClose();
      } else {
        toast.error(data.message || 'Status synchronization failed');
      }
    } catch (error) {
      toast.error('Network error during synchronization');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentConfig = STATUS_CONFIG[order.status] || { theme: 'bg-muted text-muted-foreground border-border', icon: Package };
  const StatusIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      
      {/* Main Specification Overlay */}
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 1. Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-lg border ${currentConfig.theme}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                Order Specification
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest border ${currentConfig.theme}`}>
                  {order.status}
                </span>
              </h2>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                <span className="flex items-center gap-1"><Fingerprint className="w-3 h-3" /> {order.orderId}</span>
                {order.items.length > 1 && (
                  <span className="flex items-center gap-1 text-primary bg-primary/10 px-1.5 rounded">
                    <Layers className="w-3 h-3" /> {order.items.length} Distinct Items
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            
            {/* LEFT COLUMN */}
            <div className="space-y-8">
              
              {/* Subscriber Spec */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Subscriber Origin
                </h4>
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Registered Name</span>
                    <span className="font-bold text-foreground">{order.fullName || 'Unidentified'}</span>
                  </div>
                  {order.userEmail && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">Email Identity</span>
                      <span className="font-medium text-foreground">{order.userEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Contact String</span>
                    <span className="font-mono text-foreground">{order.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-3 border-t border-border">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest">System UID</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{order.pidUser}</span>
                  </div>
                </div>
              </div>

              {/* Order Manifest Matrix */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Order Manifest
                </h4>
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border text-[9px] uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-bold tracking-wider">Item Designation</th>
                        <th className="px-4 py-2 font-bold tracking-wider text-center">Qty</th>
                        <th className="px-4 py-2 font-bold tracking-wider text-right">Sum</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {order.items.map((item, index) => (
                        <tr key={index} className="hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium text-foreground leading-tight max-w-[200px] truncate" title={item.product_name}>
                            {item.product_name}
                            <div className="text-[9px] font-mono text-muted-foreground mt-0.5">{formatCurrency(item.unit_price)} / unit</div>
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-foreground">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-foreground">
                            {formatCurrency(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/10 border-t-2 border-border">
                      <tr>
                        <td className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gross Total</td>
                        <td className="px-4 py-3 text-center font-mono text-[10px] text-muted-foreground">{order.totalQuantity} items</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-primary text-sm">{formatCurrency(order.totalPrice)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-8">
              
              {/* Fulfillment Coordinates */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Fulfillment Coordinates
                </h4>
                <div className="bg-card border border-border rounded-xl p-4">
                  {order.address ? (
                    <p className="text-xs text-foreground leading-relaxed italic border-l-2 border-primary pl-3">
                      {order.address}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No physical coordinates provisioned in ledger.</p>
                  )}
                </div>
              </div>

              {/* Chronological Meta */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Timestamp & Meta
                </h4>
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Original Transaction</span>
                    <span className="font-mono text-foreground font-bold">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-muted-foreground">Latest Ledger Sync</span>
                    <span className="font-mono text-foreground font-bold">{formatDate(order.updatedAt)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-3 border-t border-border">
                    <span className="text-muted-foreground">Checkout Topology</span>
                    <span className="font-bold uppercase tracking-wider text-foreground">{order.purchaseType || 'Standard Retail'}</span>
                  </div>
                </div>
              </div>
              
              {/* Read-Only Tracking Data (If Shipped) */}
              {(order.trackingNumber || order.trackingCompany) && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5" /> Active Carrier Meta
                  </h4>
                  <div className="bg-card border border-border rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Carrier / Node</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{order.trackingCompany || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">Tracking URI</p>
                      <p className="text-sm font-mono font-bold text-foreground mt-0.5">{order.trackingNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. Operational Transition Block (Footer) */}
        <div className="p-6 border-t border-border bg-muted/10 shrink-0">
          <div className="flex items-center gap-2 mb-4">
             <RefreshCw className="w-3.5 h-3.5 text-primary" />
             <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground">Initiate Workflow Transition</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Target Status Node</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-xs font-bold uppercase tracking-widest text-foreground focus:ring-2 focus:ring-primary/20"
              >
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Tracking Key (If Applicable)</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Airway / Waybill String"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs font-mono text-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Carrier Entity</label>
              <input
                type="text"
                value={trackingCompany}
                onChange={(e) => setTrackingCompany(e.target.value)}
                placeholder="Logistics Provider (e.g. DHL)"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border/50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-[10px] font-bold text-foreground bg-card border border-border rounded-lg hover:bg-muted uppercase tracking-widest transition-colors"
            >
              Abort Sync
            </button>
            <button
              onClick={() => setShowConfirmation(true)}
              disabled={isUpdating}
              className="px-6 py-2.5 text-[10px] font-bold text-primary-foreground bg-primary rounded-lg shadow-sm hover:bg-primary/90 uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Commit State
            </button>
          </div>
        </div>
      </div>

      {/* 4. Security Confirmation Layer */}
      {showConfirmation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm px-4 animate-in zoom-in-95 duration-200">
          <div className="bg-card border border-border p-8 rounded-xl shadow-2xl max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-amber-500/20">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-widest">Confirm Workflow Shift</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed px-2">
                Transitioning this node from <span className="font-bold text-foreground">{order.status}</span> to <span className="font-bold text-primary">{newStatus}</span> will log the event and trigger automated subscriber notifications.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2.5 text-[10px] font-bold text-foreground hover:bg-muted border border-border rounded-lg uppercase tracking-widest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-lg shadow-sm hover:bg-primary/90 uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Execute Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}