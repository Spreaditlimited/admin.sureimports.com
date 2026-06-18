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
  RefreshCw,
  TriangleAlert
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
    invoice?: {
        pidInvoice: string;
        invoiceNumber: string;
        status: string;
        balanceDue: string;
    } | null;
}

const OrdersBoxShippingOnly = () => {
    const [active, setActive] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [orderALL, setOrderALL] = useState<Order[]>([]);
    const [message, setMessage] = useState<string>('');
    const [pendingAction, setPendingAction] = useState<'approve' | 'decline' | ''>('');
    const [issuingInvoiceId, setIssuingInvoiceId] = useState<string>('');
    const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
    
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

    const isNigeriaDestination = (value: string | null | undefined) => {
        return String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ') === 'nigeria';
    };

    const getNextStatusForAction = (currentStatus: string, action: string, isInternational = false) => {
        if (action !== 'approve' && action !== 'decline') return '';
        return getShippingOnlyNextStatus(currentStatus, action, isInternational) || '';
    };

    const getActionLabelForNextStatus = (nextStatus: string) => {
        const labels: Record<string, string> = {
            'request-received': 'Reopen Request',
            'product-shipped': 'Ship',
            'product-arrived': 'Mark Arrived',
            invoiced: 'Mark Invoiced',
            paid: 'Mark Paid',
            'product-delivered': 'Mark Completed',
            'request-cancelled': 'Cancel Request',
        };
        return labels[nextStatus] || 'Update Status';
    };

    const hasProductShipped = (currentStatus: string, isInternational: boolean) => {
        if (isInternational) {
            return ['product-shipped', 'product-arrived', 'product-delivered'].includes(currentStatus);
        }
        return ['product-shipped', 'product-arrived', 'invoiced', 'paid', 'product-delivered'].includes(currentStatus);
    };

    const processStatusChange = async ({
        pidUser,
        pidOrder,
        currentStatus,
        isInternational,
        action,
        note,
    }: {
        pidUser: string;
        pidOrder: string;
        currentStatus: string;
        isInternational: boolean;
        action: 'approve' | 'decline';
        note: string;
    }) => {
        const formData = new FormData();
        const orderCurrentStatus = currentStatus;
        const nextStatus = getNextStatusForAction(orderCurrentStatus, action, isInternational);

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
        formData.append('message', note);

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
                setCancelTarget(null);
            } else {
                toast.error(data?.responsex?.message || data?.message || 'Unable to update freight state.');
            }
        } catch {
            toast.error('Communication error with server');
        } finally {
            setPendingAction('');
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const action = pendingAction;
        const formData = new FormData(event.currentTarget);

        await processStatusChange({
            pidUser: String(formData.get('pidUser') || ''),
            pidOrder: String(formData.get('pidOrder') || ''),
            currentStatus: String(formData.get('currentStatus') || ''),
            isInternational: String(formData.get('isInternational') || '') === 'true',
            action: action as 'approve' | 'decline',
            note: message,
        });
    };

    const handleIssueInvoice = async (pidInvoice: string) => {
        try {
            setIssuingInvoiceId(pidInvoice);
            const res = await fetch(`/api/invoicing/invoices/${encodeURIComponent(pidInvoice)}/issue`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data?.message || data?.statusx || 'Failed to issue invoice.');
                return;
            }
            toast.success('Invoice issued');
            await fetchDataOrder();
        } catch {
            toast.error('Failed to issue invoice.');
        } finally {
            setIssuingInvoiceId('');
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

            {orderALL.map((order, index) => {
                const destinationName = order.shippingToName || order.shippingTo;
                const isInternational = !isNigeriaDestination(destinationName);
                const currentStatus = normalizeShippingOnlyStatus(order.status);
                const nextApproveStatus = getNextStatusForAction(order.status, 'approve', isInternational);
                const approveActionLabel = getActionLabelForNextStatus(nextApproveStatus);
                const invoiceHref = order.invoice
                    ? `/dashboard/invoicing/${order.invoice.pidInvoice}`
                    : `/dashboard/invoicing/create?linkedShippingOnlyId=${order.pidShippingOnly}`;
                const invoiceStatus = String(order.invoice?.status || '').toUpperCase();
                const requiresInvoicePrimaryAction =
                    currentStatus === 'invoiced' ||
                    (isInternational && currentStatus === 'request-received') ||
                    (!isInternational && currentStatus === 'product-arrived');
                const invoicePrimaryLabel = !order.invoice
                    ? 'Create Invoice'
                    : invoiceStatus === 'DRAFT'
                        ? 'Issue Invoice'
                        : 'Manage Invoice';
                const isCompleted = currentStatus === 'product-delivered';
                const canCancel = currentStatus !== 'request-cancelled' && !hasProductShipped(currentStatus, isInternational);

                return (
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
                                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Shipping To: {formatReadable(destinationName)}</span>
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
                                        <input type="hidden" name="isInternational" value={String(isInternational)} />
                                    </div>

                                    <div className="lg:col-span-4 space-y-3">
                                        {isCompleted ? (
                                            <div className="w-full flex items-center justify-center py-2">
                                                <div className="-rotate-2 rounded-md border-2 border-emerald-500/70 bg-emerald-500/10 px-6 py-3 text-center shadow-sm">
                                                    <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-600">
                                                        Completed
                                                    </div>
                                                    <div className="mt-1 h-px bg-emerald-500/40" />
                                                    <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-emerald-700/80">
                                                        Workflow Closed
                                                    </div>
                                                </div>
                                            </div>
                                        ) : requiresInvoicePrimaryAction ? (
                                            <button
                                                type="button"
                                                disabled={Boolean(order.invoice && invoiceStatus === 'DRAFT' && issuingInvoiceId === order.invoice.pidInvoice)}
                                                onClick={() => {
                                                    if (!order.invoice || invoiceStatus !== 'DRAFT') {
                                                        router.push(invoiceHref);
                                                        return;
                                                    }
                                                    handleIssueInvoice(order.invoice.pidInvoice);
                                                }}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {order.invoice && invoiceStatus === 'DRAFT' && issuingInvoiceId === order.invoice.pidInvoice ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                )}
                                                {invoicePrimaryLabel}
                                            </button>
                                        ) : (
                                            <button
                                                type="submit"
                                                name="action"
                                                value="approve"
                                                onClick={() => setPendingAction('approve')}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-primary/90 transition-all"
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> {approveActionLabel}
                                            </button>
                                        )}
                                        {canCancel && (
                                            <button
                                                type="button"
                                                onClick={() => setCancelTarget(order)}
                                                className="w-full flex items-center justify-center gap-2 py-3 bg-background border border-border text-foreground rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all"
                                            >
                                                <XCircle className="w-4 h-4 text-destructive" /> Cancel Request
                                            </button>
                                        )}
                                        {!isCompleted && (
                                            <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-tighter">Next Logistics Node: <span className="text-primary">{getShippingOnlyStatusLabel(nextApproveStatus)}</span></p>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                    </AnimateHeight>
                </div>
                );
            })}
            {cancelTarget ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={`cancel-shipping-title-${cancelTarget.pidShippingOnly}`}
                >
                    <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-card border border-border shadow-soft animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
                                <TriangleAlert className="h-6 w-6 text-destructive" />
                            </div>

                            <h3
                                id={`cancel-shipping-title-${cancelTarget.pidShippingOnly}`}
                                className="mb-2 text-center text-xl font-bold text-foreground tracking-tight"
                            >
                                Cancel Shipping Request
                            </h3>
                            <p className="mb-4 text-center text-sm text-muted-foreground">
                                This will move the request to Request Cancelled and notify the customer.
                            </p>

                            <div className="mb-6 rounded-md border border-border bg-muted/30 p-4 text-sm text-foreground shadow-inner">
                                <p className="font-semibold">{cancelTarget.shippingName}</p>
                                <p className="mt-1 text-xs text-muted-foreground">ID: {cancelTarget.pidShippingOnly}</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCancelTarget(null)}
                                    className="flex-1 rounded-md bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    Keep Request
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const destinationName = cancelTarget.shippingToName || cancelTarget.shippingTo;
                                        processStatusChange({
                                            pidUser: cancelTarget.pidUser,
                                            pidOrder: cancelTarget.pidShippingOnly,
                                            currentStatus: cancelTarget.status,
                                            isInternational: !isNigeriaDestination(destinationName),
                                            action: 'decline',
                                            note:
                                                message ||
                                                `Your Shipping Only request (${cancelTarget.pidShippingOnly}) has been cancelled.`,
                                        });
                                    }}
                                    className="flex-1 rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                                >
                                    Cancel Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default OrdersBoxShippingOnly;
