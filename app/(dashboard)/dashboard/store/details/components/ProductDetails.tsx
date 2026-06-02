'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Edit3, 
  Tag, 
  Calendar, 
  CheckCircle2, 
  Info, 
  Layers,
  FileText,
  Boxes,
  RefreshCw
} from 'lucide-react';

interface Product {
  pidProduct: string;
  productName: string;
  productPrice: string;
  productSlug: string;
  productCategory: string;
  productBrand: string;
  productMOQ: string;
  productDescription: string;
  productFeature: string;
  productSpecification: string;
  productVisibility: string;
  productImage: string;
  productImageType: string;
  productImageExt: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductDetailsDisplayProps {
  product: Product;
}

const resolveProductImageSrc = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw === 'null' || raw === 'undefined') return null;

  if (/^https?:\/\//i.test(raw)) return raw;

  const base = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL?.trim();
  if (!base) return null;

  const path = raw.includes('/') ? raw : `admin-sureimports/store/${raw}`;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export const ProductDetailsDisplay: React.FC<ProductDetailsDisplayProps> = ({ product }) => {
  const router = useRouter();
  const imageSrc = resolveProductImageSrc(product.productImage);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard/store/view');
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(parseFloat(value) || 0);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. Action & Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div className="flex items-center gap-3">
            <button 
                onClick={handleBack}
                className="p-2 bg-background border border-border rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
                <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Catalog Archive</span>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Product Specification</h2>
            </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
                product.productVisibility === 'true' 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                : 'bg-muted text-muted-foreground border-border'
            }`}>
               {product.productVisibility === 'true' ? 'Live on Store' : 'Hidden / Draft'}
            </div>
            <button 
                onClick={() => router.push(`/dashboard/store/edit?id=${product.pidProduct}`)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-xs font-bold shadow-sm hover:bg-primary/90 transition-all"
            >
                <Edit3 className="w-3.5 h-3.5" /> Modify Product
            </button>
        </div>
      </div>

      {/* 2. Primary Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Product Visual Card */}
        <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-soft p-2 overflow-hidden">
            <div className="aspect-square relative bg-muted/30 rounded-lg overflow-hidden border border-border/50">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={product.productName}
                    fill
                    className="object-contain p-4"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground/50 text-xs font-medium">
                    No image available
                  </div>
                )}
            </div>
        </div>

        {/* Identity & Core Metrics */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-soft p-6 sm:p-8 flex flex-col justify-between h-full">
                <div className="space-y-6">
                    <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> {product.productBrand} • {product.productCategory}
                        </span>
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">{product.productName}</h1>
                        <p className="text-xs font-mono text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded">PID: {product.pidProduct}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 border-t border-border">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Retail Price</span>
                            <p className="text-xl font-bold text-foreground font-mono">{formatCurrency(product.productPrice)}</p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min. Order (MOQ)</span>
                            <p className="text-xl font-bold text-foreground flex items-center gap-2">
                                {product.productMOQ} <span className="text-xs text-muted-foreground font-medium">Units</span>
                            </p>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Stock Status</span>
                            <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-bold">In Stock</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Condition</span>
                            <p className="text-sm font-bold text-foreground uppercase tracking-tight">Active Catalog</p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Registered On</span>
                            <span className="text-xs font-medium">{formatDate(product.createdAt)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Last Inventory Sync</span>
                            <span className="text-xs font-medium">{formatDate(product.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* 3. Detailed Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Description & Features */}
        <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" /> Product Narrative
                    </h3>
                </div>
                <div className="p-6">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap italic">
                        {product.productDescription || "No primary description provided for this item."}
                    </p>
                </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-muted/20">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" /> Key Feature Highlights
                    </h3>
                </div>
                <div className="p-6">
                    <div className="bg-muted/30 border border-border rounded-lg p-4">
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span className="text-sm text-foreground font-medium">{product.productFeature || "Standard Sure Imports hardware certification."}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        {/* Technical Specifications */}
        <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden h-fit">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-primary" /> Technical Data Sheet
                </h3>
            </div>
            <div className="p-6">
                <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 flex items-center gap-2">
                                    <Info className="w-3.5 h-3.5" /> Specification Parameter
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            <tr className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-4 text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                                    {product.productSpecification || "General Hardware Specifications Apply."}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-dashed border-border">
                    <p className="text-[10px] text-muted-foreground text-center uppercase font-bold tracking-widest">
                        End of Specification Sheet
                    </p>
                </div>
            </div>
        </div>
      </div>

    </div>
  );
};

export default ProductDetailsDisplay;
