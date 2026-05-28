'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Save, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  ArrowRightLeft, 
  Info,
  Coins
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface ExchangeRateProps {
    rates: {
        exNairaToDollar: number;
        exYuanToDollar: number;
        exNairaToYuan: number;
    }
}

const ExchangeRatesForm: React.FC<ExchangeRateProps> = ({ rates }) => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [nairaToDollar, setExNairaToDollar] = useState<number>(rates.exNairaToDollar);
    const [yuanToDollar, setExYuanToDollar] = useState<number>(rates.exYuanToDollar);
    const [nairaToYuan, setExNairaToYuan] = useState<number>(rates.exNairaToYuan);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        toast.info('Synchronizing global currency ledger...');

        const formData = new FormData();
        formData.append('nairaToDollar', nairaToDollar.toString());
        formData.append('yuanToDollar', yuanToDollar.toString());
        formData.append('nairaToYuan', nairaToYuan.toString());

        try {
            const res = await fetch('/api/crud/exchange-rate/update', {
                method: 'PUT',
                body: formData,
            });

            const data = await res.json();
            if (data.statusx === 'SUCCESS') {
                toast.success('Exchange rates synchronized successfully');
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
                
                {/* 1. Conversion Matrix Card */}
                <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                    <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" /> Global Conversion Matrix
                        </h3>
                        <div className="flex items-center gap-2 px-2 py-1 bg-primary/5 rounded border border-primary/10 text-[10px] font-bold text-primary uppercase">
                            Live Ledger
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Naira to Dollar */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ArrowRightLeft className="w-3 h-3" /> NGN to USD (Base)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-xs">₦</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={nairaToDollar}
                                        onChange={(e) => setExNairaToDollar(Number(e.target.value))}
                                        required
                                        className="w-full pl-7 pr-4 py-3 text-lg border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all"
                                    />
                                </div>
                            </div>

                            {/* Yuan to Dollar */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <Coins className="w-3 h-3" /> CNY to USD (Cross Rate)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-xs">¥</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={yuanToDollar}
                                        onChange={(e) => setExYuanToDollar(Number(e.target.value))}
                                        required
                                        className="w-full pl-7 pr-4 py-3 text-lg border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all"
                                    />
                                </div>
                            </div>

                            {/* Naira to Yuan */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                    <ArrowRightLeft className="w-3 h-3" /> NGN to CNY (Direct)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono font-bold text-xs">₦</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={nairaToYuan}
                                        onChange={(e) => setExNairaToYuan(Number(e.target.value))}
                                        required
                                        className="w-full pl-7 pr-4 py-3 text-lg border border-input rounded-md bg-background text-foreground font-bold font-mono focus:ring-2 focus:ring-ring transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Impact Warning */}
                        <div className="flex gap-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-primary uppercase">Financial Implication</p>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    Updating these rates will immediately re-calculate the <span className="font-bold text-foreground">Retail Prices</span> on the storefront and the <span className="font-bold text-foreground">Invoiced Amounts</span> for all new orders. Please verify the current black market or official interbank rates before committing.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 bg-muted/10 border-t border-border flex justify-end">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {isLoading ? 'Updating Rates...' : 'Commit Exchange Changes'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ExchangeRatesForm;