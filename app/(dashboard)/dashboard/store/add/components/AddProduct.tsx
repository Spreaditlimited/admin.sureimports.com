'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import { 
  PlusCircle, 
  Package, 
  BadgeDollarSign, 
  Settings2, 
  FileText, 
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import ImageBox2 from '@/componentsx/ImageBox2';

const Page = () => {
    const { user } = useAuth();
    const navigateWithAlert = useNavigationWithAlert();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // Form State
    const productID = 'STORE' + new Date().getTime().toString();
    const [pidProduct, setPidProduct] = useState(productID);
    const [productName, setProductName] = useState('');
    const [productCategory, setProductCategory] = useState('');
    const [productBrand, setProductBrand] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [productMOQ, setProductMOQ] = useState('');
    const [affiliatePayout, setAffiliatePayout] = useState('');
    const [superAffiliatePayout, setSuperAffiliatePayout] = useState('');
    const [productCondition, setProductCondition] = useState('');
    const [warrantyPeriod, setWarrantyPeriod] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productFeatures, setProductFeatures] = useState('');
    const [productSpecification, setProductSpecification] = useState('');
    const [isProductVisible, setIsProductVisible] = useState(true);

    const handleImageChange = (file: File) => setFile(file);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file) return toast.error('Please select a product image');
        
        setIsLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('pidProduct', pidProduct);
        formData.append('productName', productName);
        formData.append('productCategory', productCategory);
        formData.append('productBrand', productBrand);
        formData.append('productPrice', productPrice);
        formData.append('productMOQ', productMOQ);
        formData.append('affiliatePayout', affiliatePayout);
        formData.append('superAffiliatePayout', superAffiliatePayout);
        formData.append('productCondition', productCondition);
        formData.append('warrantyPeriod', warrantyPeriod);
        formData.append('productDescription', productDescription);
        formData.append('productFeatures', productFeatures);
        formData.append('productSpecification', productSpecification);
        formData.append('isProductVisible', isProductVisible.toString());

        try {
            const res = await fetch('/api/crud/store/create', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.statusx === 'SUCCESS') {
                navigateWithAlert('/dashboard/store/view', 'success', 'Product created successfully!');
            } else {
                toast.error(data.message || 'Failed to create product');
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            
            {/* SECTION 1: CORE IDENTITY */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" /> 1. Product Identity
                    </h3>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product Title *</label>
                        <input
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            type="text"
                            required
                            placeholder="e.g. MacBook Pro 16-inch M3"
                            className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category *</label>
                            <select
                                value={productCategory} 
                                onChange={(e) => setProductCategory(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select Category</option>
                                <option value="laptop">Laptop</option>
                                <option value="desktop">Desktop</option>
                                <option value="phone">Phones</option>
                                <option value="watch">Watch</option>
                                <option value="tablet">Tablet</option>
                                <option value="accessories">Accessories</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Manufacturer / Brand *</label>
                            <select
                                value={productBrand} 
                                onChange={(e) => setProductBrand(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select Brand</option>
                                <option value="apple">Apple</option>
                                <option value="hp">HP</option>
                                <option value="dell">Dell</option>
                                <option value="samsung">Samsung</option>
                                <option value="lenovo">Lenovo</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: FINANCIALS & COMMISSION */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <BadgeDollarSign className="w-4 h-4 text-primary" /> 2. Pricing & Commissions
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retail Price (₦) *</label>
                            <input
                                type="number" 
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                required
                                placeholder="0.00"
                                className="w-full px-4 py-2.5 text-sm font-bold font-mono border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Minimum Order Quantity (MOQ) *</label>
                            <input
                                type="number" 
                                value={productMOQ}
                                onChange={(e) => setProductMOQ(e.target.value)}
                                required
                                placeholder="1"
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>

                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Affiliate Structure</span>
                        <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Standard Payout</span>
                                <input
                                    type="number" 
                                    value={affiliatePayout}
                                    onChange={(e) => setAffiliatePayout(e.target.value)}
                                    placeholder="₦ 0.00"
                                    className="px-3 py-2 text-xs font-bold border border-input rounded bg-background"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Super Affiliate Payout</span>
                                <input
                                    type="number" 
                                    value={superAffiliatePayout}
                                    onChange={(e) => setSuperAffiliatePayout(e.target.value)}
                                    placeholder="₦ 0.00"
                                    className="px-3 py-2 text-xs font-bold border border-input rounded bg-background"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: LOGISTICS & CONDITION */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" /> 3. Product Logistics
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Condition *</label>
                        <select
                            value={productCondition} 
                            onChange={(e) => setProductCondition(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
                        >
                            <option value="">Select Condition</option>
                            <option value="BRAND_NEW">Brand New</option>
                            <option value="PRE_OWNED">Pre-Owned</option>
                            <option value="REFURBISHED">Refurbished</option>
                            <option value="OPEN_BOX">Open Box</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Warranty Scope *</label>
                        <select
                            value={warrantyPeriod} 
                            onChange={(e) => setWarrantyPeriod(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
                        >
                            <option value="">No Warranty</option>
                            <option value="MONTHS3">3 Months</option>
                            <option value="MONTHS6">6 Months</option>
                            <option value="MONTHS12">12 Months</option>
                            <option value="MONTHS24">24 Months</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION 4: MEDIA & CONTENT */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> 4. Rich Content & Media
                    </h3>
                </div>
                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                         <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5" /> Primary Showcase Image
                         </label>
                         <div className="w-fit p-1 border border-dashed border-border rounded-lg bg-muted/30">
                            <ImageBox2 onImageChange={handleImageChange} imagex={''} />
                         </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Main Description *</label>
                            <textarea
                                value={productDescription}
                                onChange={(e) => setProductDescription(e.target.value)}
                                rows={4}
                                required
                                placeholder="Describe the product value proposition..."
                                className="w-full px-4 py-3 text-sm border border-input rounded-md bg-background resize-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Key Features</label>
                                <textarea
                                    value={productFeatures}
                                    onChange={(e) => setProductFeatures(e.target.value)}
                                    rows={4}
                                    placeholder="Bullet point features..."
                                    className="w-full px-4 py-3 text-xs border border-input rounded-md bg-background resize-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pay Small Small Details</label>
                                <textarea
                                    value={productSpecification}
                                    onChange={(e) => setProductSpecification(e.target.value)}
                                    rows={4}
                                    placeholder="Installment payment specifications..."
                                    className="w-full px-4 py-3 text-xs border border-input rounded-md bg-background resize-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 px-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={isProductVisible}
                            onChange={(e) => setIsProductVisible(e.target.checked)}
                        />
                        <div className="w-10 h-5 bg-muted border border-border rounded-full peer peer-checked:bg-primary transition-all"></div>
                        <div className="absolute top-1 left-1 w-3 h-3 bg-foreground rounded-full peer-checked:translate-x-5 transition-all"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground">Active Visibility</span>
                        <span className="text-[10px] text-muted-foreground">Publicly visible on storefront</span>
                    </div>
                </label>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                    {isLoading ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" /> Finalizing Catalog...</>
                    ) : (
                        <><CheckCircle2 className="w-4 h-4" /> Add to Storefront</>
                    )}
                </button>
            </div>
        </form>
    );
};

export default Page;