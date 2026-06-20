'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Save, 
  Globe, 
  Banknote, 
  Truck, 
  PlusCircle, 
  RefreshCw,
  Info,
  Ruler
} from 'lucide-react';
import { countryArray } from '@/lib/countries';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

// API Response Interface
interface ApiResponse {
    responsex: {
        status: string;
        message: string;
    };
    successx: boolean;
}

const shippingPlanArray = [
  { label: 'Normal Shipping', value: 'NORMAL_SHIPPING' },
  { label: 'Express Shipping', value: 'EXPRESS_SHIPPING' },
  { label: 'Special Shipping', value: 'SPECIAL_SHIPPING' },
  { label: 'Sea Shipping', value: 'SEA_SHIPPING' },
] as const;

const shippingRateUnitArray = [
  { label: 'Per KG', value: 'KG' },
  { label: 'Per CBM', value: 'CBM' },
] as const;

const ViewShippingPlan = () => {
    const navigateWithAlert = useNavigationWithAlert();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [country, setCountry] = useState('');
    const [shippingPlan, setShippingPlan] = useState('');
    const [shippingRate, setShippingRate] = useState('');
    const [shippingPlanUnit, setShippingPlanUnit] = useState<'KG' | 'CBM'>('KG');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!country || !shippingPlan || !shippingRate || !shippingPlanUnit) {
            return toast.error("Please complete all fields");
        }

        setIsLoading(true);
        toast.info('Registering new shipping rate...');

        const formData = new FormData();
        formData.append('pidShippingPlan', 'SHP' + new Date().getTime());
        formData.append('pidCountry', 'CTY' + new Date().getTime());
        formData.append('country', country);
        formData.append('shippingPlan', shippingPlan);
        formData.append('shippingRate', shippingRate);
        formData.append('shippingPlanUnit', shippingPlanUnit);

        try {
            const res = await fetch('/api/crud/posts/create/shipping-plan', {
                method: 'POST',
                body: formData,
            });

            const data: ApiResponse = await res.json();
            
            if (data.responsex.status === 'SUCCESS') {
                navigateWithAlert('/dashboard/shipping-plans', 'success', 'New shipping plan added to global logistics.');
            } else {
                toast.warning(data.responsex.message);
            }
        } catch (error: any) {
            toast.error(error.message || "A network error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 1. Quick Add Card */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-primary" /> Provision New Route
                    </h3>
                    <div className="flex items-center gap-2 px-2 py-1 bg-primary/5 rounded border border-primary/10 text-[10px] font-bold text-primary uppercase">
                        Global Logistics
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                        
                        {/* Destination Country */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Globe className="w-3 h-3" /> Target Country
                            </label>
                            <select 
                                value={country} 
                                onChange={(e) => setCountry(e.target.value)}
                                required
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-medium"
                            >
                                <option value="">Select Destination</option>
                                {countryArray.map((datax, index) => (
                                    <option key={index} value={datax.value}>{datax.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Shipping Plan Type */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Truck className="w-3 h-3" /> Plan Type
                            </label>
                            <select 
                                value={shippingPlan} 
                                onChange={(e) => setShippingPlan(e.target.value)}
                                required
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-medium"
                            >
                                <option value="">Select Plan</option>
                                {shippingPlanArray.map((plan, index) => (
                                    <option key={index} value={plan.value}>{plan.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rate Input */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Banknote className="w-3 h-3" /> Shipping Rate ($)
                            </label>
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                value={shippingRate}
                                onChange={(e) => setShippingRate(e.target.value)}
                                required 
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all"
                            />
                        </div>

                        {/* Rate Unit */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Ruler className="w-3 h-3" /> Rate Unit
                            </label>
                            <select
                                value={shippingPlanUnit}
                                onChange={(e) => setShippingPlanUnit(e.target.value as 'KG' | 'CBM')}
                                required
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all font-medium"
                            >
                                {shippingRateUnitArray.map((unit) => (
                                    <option key={unit.value} value={unit.value}>{unit.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Submit Action */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isLoading ? 'Processing...' : 'Register Route'}
                        </button>
                    </form>
                </div>
            </div>

            {/* 2. Logic Information Tip */}
            <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg max-w-3xl">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-primary uppercase">Logistics Snapshot</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Adding a shipping plan here creates a new pricing rule for the selected region. Rates are calculated per KG or CBM depending on the plan type. Ensure your rates are synchronized with current exchange models.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ViewShippingPlan;
