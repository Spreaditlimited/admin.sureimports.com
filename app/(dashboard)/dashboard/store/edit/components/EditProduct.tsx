'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import { 
  Save, 
  Package, 
  BadgeDollarSign, 
  Settings2, 
  FileText, 
  Image as ImageIcon,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import ImageBox2 from '@/componentsx/ImageBox2';

type Product = {
  pidProduct: string
  productName: string
  productPrice: string
  productSlug: string
  productCategory: string
  productBrand: string
  productMOQ: string
  affiliatePayout: string
  superAffiliatePayout: string
  productCondition: string
  warrantyPeriod: string
  productDescription: string
  productFeature: string
  productSpecification: string
  productVisibility: string
  productImage: string
  productImageType: string
  productImageExt: string
  createdAt: Date
  updatedAt: Date
}

interface EditProductProps {
  product: Product
}

export const EditProductPage: React.FC<EditProductProps> = ({ product }) => {
    const { user } = useAuth();
    const navigateWithAlert = useNavigationWithAlert();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // Form State (Prefilled)
    const [pidProduct, setPidProduct] = useState(product.pidProduct);
    const [productName, setProductName] = useState(product.productName);
    const [productCategory, setProductCategory] = useState(product.productCategory);
    const [productBrand, setProductBrand] = useState(product.productBrand);
    const [productPrice, setProductPrice] = useState(product.productPrice);
    const [productMOQ, setProductMOQ] = useState(product.productMOQ);
    const [affiliatePayout, setAffiliatePayout] = useState(product.affiliatePayout);
    const [superAffiliatePayout, setSuperAffiliatePayout] = useState(product.superAffiliatePayout);
    const [productCondition, setProductCondition] = useState(product.productCondition);
    const [warrantyPeriod, setWarrantyPeriod] = useState(product.warrantyPeriod);
    const [productDescription, setProductDescription] = useState(product.productDescription);
    const [productFeatures, setProductFeatures] = useState(product.productFeature);
    const [productSpecification, setProductSpecification] = useState(product.productSpecification);
    const [imagex, setImagex] = useState(product.productImage);
    const [isProductVisible, setIsProductVisible] = useState(product.productVisibility === 'true');

    const handleImageChange = (file: File) => setFile(file);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        toast.info('Synchronizing product updates...');

        const formData = new FormData();
        if (file) formData.append('file', file);
        formData.append('pidProduct', pidProduct);
        formData.append('productName', productName);
        formData.append('productCategory', productCategory);
        formData.append('productBrand', productBrand);
        formData.append('productPrice', productPrice);
        formData.append('productMOQ', productMOQ);
        formData.append('productDescription', productDescription);
        formData.append('productFeatures', productFeatures);
        formData.append('productSpecification', productSpecification);
        formData.append('affiliatePayout', affiliatePayout);
        formData.append('superAffiliatePayout', superAffiliatePayout);
        formData.append('productCondition', productCondition);
        formData.append('warrantyPeriod', warrantyPeriod);
        formData.append('isProductVisible', isProductVisible.toString());

        try {
            const res = await fetch('/api/crud/store/update', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.statusx === 'SUCCESS') {
                navigateWithAlert('/dashboard/store/view', 'success', 'Product specifications updated successfully');
            } else {
                toast.error(data.message || 'Update failed');
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
                        <Package className="w-4 h-4 text-primary" /> 1. Identity & Classification
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
                            className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring transition-all"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category Mapping *</label>
                            <select
                                value={productCategory} 
                                onChange={(e) => setProductCategory(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            >
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
                                <option value="hp">HP</option>
                                <option value="dell">DELL</option>
                                <option value="asus">ASUS</option>
                                <option value="acer">ACER</option>
                                <option value="lenovo">LENOVO</option>
                                <option value="apple">APPLE</option>
                                <option value="samsung">SAMSUNG</option>
                                <option value="google">GOOGLE</option>
                                <option value="microsoft">MICROSOFT</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: FINANCIALS */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <BadgeDollarSign className="w-4 h-4 text-primary" /> 2. Financial Ledger & MOQ
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Listing Price (₦) *</label>
                            <input
                                type="number" 
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 text-sm font-bold font-mono border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min. Order Quantity (MOQ) *</label>
                            <input
                                type="number" 
                                value={productMOQ}
                                onChange={(e) => setProductMOQ(e.target.value)}
                                required
                                className="w-full px-4 py-2.5 text-sm border border-input rounded-md bg-background text-foreground focus:ring-2 focus:ring-ring"
                            />
                        </div>
                    </div>

                    <div className="p-5 bg-primary/5 border border-primary/20 rounded-lg space-y-5">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Affiliate Revenue Model</span>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Standard Affiliate (₦)</span>
                                <input
                                    type="number" 
                                    value={affiliatePayout}
                                    onChange={(e) => setAffiliatePayout(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold border border-input rounded bg-background"
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] font-bold text-muted-foreground uppercase">Super Affiliate (₦)</span>
                                <input
                                    type="number" 
                                    value={superAffiliatePayout}
                                    onChange={(e) => setSuperAffiliatePayout(e.target.value)}
                                    className="w-full px-3 py-2 text-xs font-bold border border-input rounded bg-background"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 3: CONDITION & WARRANTY */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-primary" /> 3. Inventory Condition
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Condition *</label>
                        <select
                            value={productCondition} 
                            onChange={(e) => setProductCondition(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
                        >
                            <option value="BRAND_NEW">Brand New</option>
                            <option value="PRE_OWNED">Pre-Owned</option>
                            <option value="REFURBISHED">Refurbished</option>
                            <option value="OPEN_BOX">Open Box</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Warranty Period *</label>
                        <select
                            value={warrantyPeriod} 
                            onChange={(e) => setWarrantyPeriod(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 text-sm border border-input rounded-md bg-background focus:ring-2 focus:ring-ring"
                        >
                            <option value="MONTHS3">3 Months</option>
                            <option value="MONTHS6">6 Months</option>
                            <option value="MONTHS12">12 Months</option>
                            <option value="MONTHS24">24 Months</option>
                            <option value="MONTHS36">36 Months</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* SECTION 4: CONTENT & MEDIA */}
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> 4. Documentation & Visuals
                    </h3>
                </div>
                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                         <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="w-3.5 h-3.5" /> Product Imagery
                         </label>
                         <div className="w-fit p-1 border border-dashed border-border rounded-lg bg-muted/30">
                            <ImageBox2 onImageChange={handleImageChange} imagex={imagex} />
                         </div>
                         <p className="text-[10px] text-muted-foreground">Leave empty to retain the current primary image.</p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Public Description *</label>
                            <textarea
                                value={productDescription}
                                onChange={(e) => setProductDescription(e.target.value)}
                                rows={4}
                                required
                                className="w-full px-4 py-3 text-sm border border-input rounded-md bg-background resize-none focus:ring-2 focus:ring-ring"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Feature Highlights</label>
                                <textarea
                                    value={productFeatures}
                                    onChange={(e) => setProductFeatures(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 text-xs border border-input rounded-md bg-background resize-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Financial Terms (Pay Small Small)</label>
                                <textarea
                                    value={productSpecification}
                                    onChange={(e) => setProductSpecification(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-3 text-xs border border-input rounded-md bg-background resize-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PERSISTENT ACTION BAR */}
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
                        <div className="absolute top-1 left-1 w-3 h-3 bg-foreground rounded-full peer-checked:translate-x-5 transition-all shadow-sm"></div>
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">Catalog Visibility</span>
                            {isProductVisible ? <Eye className="w-3 h-3 text-emerald-600" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Is this product visible to the general public?</span>
                    </div>
                </label>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 sm:flex-none px-6 py-3 border border-border text-foreground rounded-lg text-sm font-bold hover:bg-muted transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-10 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        {isLoading ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" /> Updating...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save Specifications</>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
};

export default EditProductPage;