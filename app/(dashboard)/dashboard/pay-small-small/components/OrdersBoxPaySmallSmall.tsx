'use client';

import React, { useEffect, useState } from 'react';
import AnimateHeight from 'react-animate-height';
import Loader from '@/app/uix/Loader';
import { useSearchParams } from 'next/navigation';
import { toast } from "sonner";
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { ChevronDown, Package } from 'lucide-react';

// A reusable mini-component for the Customer Details grid to keep code DRY
const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
      {label}
    </span>
    <span className="text-sm font-semibold text-foreground">
      {value}
    </span>
  </div>
);

const resolveImageSrc = (imageValue: unknown): string | null => {
    if (typeof imageValue !== 'string') return null;

    const raw = imageValue.trim();
    if (!raw || raw === 'null' || raw === 'undefined') return null;

    // Some records may store JSON arrays of images; use the first valid entry.
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return resolveImageSrc(parsed[0]);
            }
        } catch {
            return null;
        }
    }

    if (/^https?:\/\//i.test(raw)) return raw;

    const base = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL?.trim();
    if (!base) return raw;

    return `${base.replace(/\/+$/, '')}/${raw.replace(/^\/+/, '')}`;
};

const ComponentsAccordionsBasic = () => {
    // VARIABLES
    const [active, setActive] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    
    const searchParams = useSearchParams();
    const status = searchParams.get('status') || 'none';
    const [orderALL, setOrderALL] = useState<any[]>([]);
    
    // Initialize the alert hook properly
    const navigateWithAlert = useNavigationWithAlert();

    const togglePara = (value: string) => {
        setActive((oldValue) => (oldValue === value ? '' : value));
    };

    // GET RECORDS FROM DATABASE
    async function fetchDataOrder() {
        try {
           const res = await fetch(`/api/get-data/pay-small-small-many?status=${status}`);
           if (res.ok) {
               const data = await res.json();
               setOrderALL(data);
           }
        } catch (error) {
           console.error('Error fetching data:', error);
           toast.error("Failed to load orders.");
        } finally {
           setLoading(false);
        }
    }

    // FORM SUBMISSION (Kept intact but cleaned up)
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.append('status', status);

        try {
            toast.info('Processing...');
            const res = await fetch('/api/status-processing/pay-small-small?status='+status, {
                method: 'POST',
                body: formData,
            });
      
            const data: any = await res.json();
      
            if (data.responsex?.status === 'SUCCESS'){
                navigateWithAlert('/dashboard', 'success', 'Payment details successfully submitted. Awaiting confirmation.');
            } else if (data.responsex?.status === 'ACTION_FAILED' || data.responsex?.status === 'EMPTY_BANK_PAYMENT_DETAILS') {
                toast.warning(data.responsex.message);
            }
        } catch (error: any) {
            console.error(error.message);
            toast.error("An error occurred while processing the request.");
        }
    };

    // FETCH ORDERS ON MOUNT OR STATUS CHANGE
    useEffect(() => {
        setLoading(true);
        fetchDataOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]); 

    // LOADER & EMPTY STATES
    if (loading) return <Loader />;
    if (orderALL.length === 0) {
        return (
            <div className="flex items-center justify-center p-12 bg-card border border-border shadow-soft rounded-lg mt-4">
                <p className="text-muted-foreground font-medium text-center">
                    No {status} orders available.
                </p>
            </div>
        ); 
    }

    return (
        <div className="space-y-4">
            
            {/* Section Title */}
            <h2 className="text-lg font-semibold text-foreground px-1 mb-4 capitalize">
                {status.replace(/-/g, ' ')} Orders
            </h2>
                
            {orderALL.map((datax: any, index: number) => {
                const itemKey = `${index + 1}`;
                const isActive = active === itemKey;
                const productName = datax.store?.productName || datax.productName || 'N/A';
                const productImage = datax.store?.productImage || '';
                const productImageSrc = resolveImageSrc(productImage);
                const productDesc = datax.store?.productDescription || datax.productDescription || 'No description available';
                
                return (
                    <div 
                        key={itemKey} 
                        className="bg-card border border-border shadow-soft rounded-lg overflow-hidden transition-all duration-200"
                    >
                        
                        {/* Accordion Header (Trigger) */}
                        <button 
                            type="button" 
                            className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${
                                isActive ? 'bg-muted/30' : 'hover:bg-muted/50'
                            }`} 
                            onClick={() => togglePara(itemKey)}
                        >
                            <div className="flex flex-col gap-1 mb-3 sm:mb-0">
                                <span className={`text-base font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                    #{index + 1} : {productName}
                                </span>
                                <span className="text-sm text-muted-foreground font-medium">
                                    Order ID: {datax.pidPaySmallSmall}
                                </span>
                            </div>
                            
                            <div className={`text-muted-foreground transition-transform duration-300 ${isActive ? 'rotate-180 text-primary' : ''}`}>
                                <ChevronDown className="w-5 h-5" />
                            </div>   
                        </button>

                        {/* Accordion Content */}
                        <AnimateHeight duration={300} height={isActive ? 'auto' : 0}>
                            <div className="border-t border-border p-4 sm:p-6 bg-background/50 space-y-6">

                                {/* Product Layout */}
                                <div className="flex flex-col md:flex-row gap-6">
                                    
                                    {/* Product Image */}
                                    <div className="w-full md:w-40 shrink-0">
                                        <div className="aspect-square w-full rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
                                            {productImageSrc ? (
                                                <img
                                                    src={productImageSrc}
                                                    alt={productName}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <Package className="h-10 w-10 text-muted-foreground/50" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Product Details */}
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                                            {productName}
                                            <span className="text-muted-foreground">|</span>
                                            <span className="text-primary">
                                                ₦{parseFloat(datax.amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                            </span>
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-medium">
                                            Last Updated: {new Date(datax.updatedAt).toLocaleString()}
                                        </p>
                                        <p className="mt-3 text-sm leading-relaxed text-foreground">
                                            {productDesc}
                                        </p>
                                    </div>
                                </div>

                                {/* Customer Details Panel */}
                                <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                                    <h4 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">
                                        Customer Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
                                        <DetailItem 
                                            label="Full Name" 
                                            value={`${datax.users?.userFirstname || ''} ${datax.users?.userLastname || ''}`.trim() || 'N/A'} 
                                        />
                                        <DetailItem 
                                            label="Email" 
                                            value={datax.users?.userEmail || 'N/A'} 
                                        />
                                        <DetailItem 
                                            label="Phone" 
                                            value={datax.users?.phone || 'N/A'} 
                                        />
                                    </div>
                                </div>

                                {/* Form Actions (If needed in the future) */}
                                <form onSubmit={handleSubmit}>
                                    {/* Administrative action buttons can be injected here utilizing our standard button classes */}
                                </form>

                            </div>
                        </AnimateHeight>
                    </div>
                )
            })}
        </div>
    );    
};

export default ComponentsAccordionsBasic;
