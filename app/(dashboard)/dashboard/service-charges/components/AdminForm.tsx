'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Save, 
  RefreshCw, 
  Percent, 
  ShieldCheck, 
  Info,
  BadgePercent,
  Wallet,
  Settings2
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface ServiceRateProps {
    rates: {
        vat: number;
        procurementFee: number;
        platformFee: number;
    }
}

const ServiceChargeForm: React.FC<ServiceRateProps> = ({ rates }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Form State prefilled from DB
    const [vat, setVat] = useState<number>(rates?.vat || 0);
    const [procurementFee, setProcurementFee] = useState<number>(rates?.procurementFee || 0);
    const [platformFee, setPlatformFee] = useState<number>(rates?.platformFee || 0);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        toast.info('Synchronizing platform fee ledger...');

        const formData = new FormData();
        formData.append('vat', vat.toString());
        formData.append('procurementFee', procurementFee.toString());
        formData.append('platformFee', platformFee.toString());

        try {
            const res = await fetch('/api/crud/exchange-rate/update', {
                method: 'PUT',
                body: formData,
            });

            const data = await res.json();
            if (data.statusx === 'SUCCESS') {
                toast.success('Global service charges updated successfully');
            } else {
                toast.error(data.message || 'Synchronization failed');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Fee Configuration Card */}
                <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-primary" /> Platform Surcharge Ledger
                        </h3>
                        <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                            Financial Core
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* VAT Percentage */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <BadgePercent className="w-3.5 h-3.5" /> Global VAT (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={vat}
                                        onChange={(e) => setVat(Number(e.target.value))}
                                        required
                                        className="w-full px-4 py-3 text-lg border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all pr-10"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Applied to all store checkout totals.</p>
                            </div>

                            {/* Procurement Fee */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5" /> Procurement Charge (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={procurementFee}
                                        onChange={(e) => setProcurementFee(Number(e.target.value))}
                                        required
                                        className="w-full px-4 py-3 text-lg border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all pr-10"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Applied to custom sourcing requests.</p>
                            </div>

                            {/* Platform Fee */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" /> System Platform Fee (%)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={platformFee}
                                        onChange={(e) => setPlatformFee(Number(e.target.value))}
                                        required
                                        className="w-full px-4 py-3 text-lg border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all pr-10"
                                    />
                                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Standard platform maintenance surcharge.</p>
                            </div>
                        </div>

                        {/* Critical Advisory Box */}
                        <div className="flex gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-amber-700 uppercase">System-Wide Impact</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Modifying these values affects the final landing cost for every user. Any increase in <span className="font-bold text-foreground">VAT</span> or <span className="font-bold text-foreground">Platform Fees</span> will be reflected in real-time across the mobile app and web storefront.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Submit Bar */}
                    <div className="px-6 py-4 bg-muted/10 border-t border-border flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isLoading ? 'Updating Ledger...' : 'Commit Platform Fees'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ServiceChargeForm;