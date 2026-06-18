'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AnimateHeight from 'react-animate-height';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    getShippingOnlyNextStatus,
    getShippingOnlyStatusLabel,
    normalizeShippingOnlyStatus,
} from '@/lib/shippingOnlyStatus';
import { 
  ChevronDown, 
  Package, 
  MessageSquare, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  Layers,
  Globe,
  Fingerprint,
  Smartphone,
  Scale,
  Calendar,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';

interface Order {
    id: number;
    pidShippingOnly: string;
    pidUser: string;
    whatsappNumber: string;
    shippingName: string;
    shippingTo: string;
    shippingToName?: string;
    grossWeight: string;
    trackingNumber: string;
    shippingPlan: string;
    shippingPlanName?: string;
    expectedShipments: string;
    wantProductVerification: string;
    wantConsolidation: string;
    multipleSuppliers: string;
    description: string;
    status: string;
    createdAt: string;
}

const OrdersBoxShippingOnly = () => {
    const [active, setActive] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [orderALL, setOrderALL] = useState<Order[]>([]);
    const [message, setMessage] = useState<string>('');
    const [pendingAction, setPendingAction] = useState<'approve' | 'decline' | ''>('');
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const status = searchParams.get('status') || 'none';

    const toggleAccordion = (id: string) => {
        setActive(prev => prev === id ? null : id);
    };

    const fetchDataOrder = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/get-data/shipping-only-many?status=${status}`);
            const data = await res.json();
            setOrderALL(data);
        } catch {
            toast.error('Failed to sync logistics ledger');
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchDataOrder();
    }, [fetchDataOrder]);

    const formatReadable = (value: string | null | undefined) => {
        const source = String(value || '').trim();
        if (!source) return 'N/A';
        if (/^[A-Z]{2,4}$/.test(source)) return source;
        return source
            .replace(/[_-]+/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const formatSelection = (value: unknown) => {
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        const normalized = String(value ?? '').trim().toLowerCase();
        if (!normalized) return 'Not Provided';
        if (['yes', 'true', '1'].includes(normalized)) return 'Yes';
        if (['no', 'false', '0'].includes(normalized)) return 'No';
        return formatReadable(String(value));
    };

    const getNextStatusForAction = (currentStatus: string, action: string) => {
        if (action !== 'approve' && action !== 'decline') return '';
        return getShippingOnlyNextStatus(currentStatus, action) || '';
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const action = pendingAction;
        const formData = new FormData(event.currentTarget);

        const pidUser = String(formData.get('pidUser') || '');
        const pidOrder = String(formData.get('pidOrder') || '');
        const orderCurrentStatus = String(formData.get('currentStatus') || '');
        const nextStatus = getNextStatusForAction(orderCurrentStatus, action);

        if (!pidUser || !pidOrder || (action !== 'approve' && action !== 'decline')) {
            toast.warning('Invalid status transition requested.');
            return;
        }

        formData.append('serviceType', 'shipping-only');
        formData.append('action', action);
        formData.append('currentStatus', orderCurrentStatus);
        if (nextStatus) {
            formData.append('newStatus', nextStatus);
        }
        formData.append('pidMessage', `MSG${Date.now()}`);
        formData.append('message', message);

        try {
            toast.info('Synchronizing logistics state...');
            const res = await fetch('/api/status-processing', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data?.message || data?.responsex?.message || 'You do not have permission to update this entry.');
                return;
            }

            if (data?.responsex?.status === 'SUCCESS') {
                toast.success('Freight state updated');
                fetchDataOrder();
                setMessage('');
            } else {
                toast.error(data?.responsex?.message || data?.message || 'Unable to update freight state.');
            }
        } catch {
            toast.error('Communication error with server');
        } finally {
            setPendingAction('');
        }
    };

    if (loading) return <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-primary w-8 h-8 opacity-20" /></div>;

    if (orderALL.length === 0) {
        return (
            <div className="py-24 text-center border-2 border-dashed border-border rounded-xl bg-muted/5 mx-2">
                <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground italic">No {getShippingOnlyStatusLabel(status)} records found</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-20">
            {/* Ledger Header */}
            <div className="flex items-center gap-3 px-1 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Layers className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">Freight Queue: {getShippingOnlyStatusLabel(status)}</h2>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">Current Volume: {orderALL.length} Entries</p>
                </div>
            </div>

            {orderALL.map((order, index) => (
                <div key={order.pidShippingOnly} className="bg-card border border-border rounded-xl shadow-soft overflow-hidden transition-all duration-300">
                    {/* Header Row */}
                    <button
                        type="button"
                        onClick={() => toggleAccordion(order.pidShippingOnly)}
                        className={`w-full flex flex-col md:flex-row md:items-center justify-between p-5 text-left transition-colors ${active === order.pidShippingOnly ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold font-mono text-muted-foreground opacity-50">#{index + 1}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{order.shippingName}</span>
                                    <div className="px-2 py-0.5 rounded-md bg-muted text-[9px] font-bold uppercase tracking-widest border border-border">ID: {order.pidShippingOnly}</div>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                    <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> WhatsApp Number: {order.whatsappNumber}</span>
                                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Shipping To: {formatReadable(order.shippingToName || order.shippingTo)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mt-4 md:mt-0">
                            <div className="flex flex-col items-end mr-4">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Provisioned On</span>
                                <span className="text-[10px] font-mono font-bold text-foreground">{new Date(order.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className={`p-2 rounded-lg transition-transform duration-300 ${active === order.pidShippingOnly ? 'rotate-180 bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'}`}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </div>
                    </button>

                    <AnimateHeight duration={300} height={active === order.pidShippingOnly ? 'auto' : 0}>
                        <div className="border-t border-border bg-muted/10">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Details Column */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><Truck className="w-3.5 h-3.5" /> Logistics Specs</h4>
                                    <div className="space-y-2.5">
                                        {[
                                            { label: 'Gross Weight', val: order.grossWeight, icon: Scale },
                                            { label: 'Tracking Number', val: order.trackingNumber || 'N/A', icon: Fingerprint },
                                            { label: 'Shipping Plan', val: formatReadable(order.shippingPlanName || order.shippingPlan), icon: Clock },
                                            { label: 'Expected Shipments', val: order.expectedShipments || 'Standard', icon: Calendar },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground flex items-center gap-1.5"><item.icon className="w-3 h-3" /> {item.label}</span>
                                                <span className="font-bold text-foreground font-mono">{item.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Requirements Column */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /> Handling Prefs</h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Want Product Verification', val: order.wantProductVerification },
                                            { label: 'Want Consolidation', val: order.wantConsolidation },
                                            { label: 'Multiple Suppliers', val: order.multipleSuppliers },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 rounded border text-[10px] uppercase font-bold tracking-tight bg-muted/50 border-border text-muted-foreground">
                                                <span>{item.label}</span>
                                                <span className="text-foreground">{formatSelection(item.val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Description Column */}
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Agent Briefing</h4>
                                    <div className="p-3 rounded-lg bg-card border border-border text-[11px] leading-relaxed text-muted-foreground italic h-[110px] overflow-y-auto custom-scrollbar">
                                        &quot;{order.description || 'No additional instructions provided by the user.'}&quot;
                                    </div>
                                </div>
                            </div>

                            {/* Workflow Transition Block */}
                            <form onSubmit={handleSubmit} className="p-6 bg-muted/30 border-t border-border">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
                                    <div className="lg:col-span-8 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-primary" /> Communicaton Bridge</label>
                                            <div className="flex items-center gap-2">
                                                <input type="checkbox" id={`confirm-${order.id}`} className="peer rounded border-border text-primary focus:ring-primary/20" required />
                                                <label htmlFor={`confirm-${order.id}`} className="text-[10px] font-bold text-foreground/90 uppercase peer-checked:text-primary transition-colors">Confirm Workflow Jump</label>
                                            </div>
                                        </div>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Transmit instructions to buyer regarding this freight update..."
                                            className="w-full p-4 bg-background border border-border rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24"
                                        />
                                        <input type="hidden" name="pidUser" value={order.pidUser} />
                                        <input type="hidden" name="pidOrder" value={order.pidShippingOnly} />
                                        <input type="hidden" name="currentStatus" value={order.status} />
                                    </div>

                                    <div className="lg:col-span-4 space-y-3">
                                        {normalizeShippingOnlyStatus(order.status) === 'product-arrived' && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(
                                                        `/dashboard/invoicing/create?linkedShippingOnlyId=${order.pidShippingOnly}`,
                                                    )
                                                }
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-background border border-border text-foreground rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all"
                                            >
                                                Create Invoice
                                            </button>
                                        )}
                                        <button 
                                            type="submit" 
                                            name="action" 
                                            value="approve" 
                                            onClick={() => setPendingAction('approve')}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Approve Entry
                                        </button>
                                        <button 
                                            type="submit" 
                                            name="action" 
                                            value="decline" 
                                            onClick={() => setPendingAction('decline')}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-background border border-border text-foreground rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all"
                                        >
                                            <XCircle className="w-4 h-4 text-destructive" /> Hold / Decline
                                        </button>
                                        <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Next Logistics Node: <span className="text-primary">{getShippingOnlyStatusLabel(getNextStatusForAction(order.status, 'approve'))}</span></p>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </AnimateHeight>
                </div>
            ))}
        </div>
    );
};

export default OrdersBoxShippingOnly;
