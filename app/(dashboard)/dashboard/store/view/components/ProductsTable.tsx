'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { 
  Edit3, 
  Plus, 
  Trash2, 
  Filter, 
  Search, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Package, 
  Tag, 
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from 'lucide-react';

interface ProductsProps {
  id: number;
  pidProduct: string;
  productName: string;
  productPrice: string;
  productBrand: string;
  productCategory: string;
  productVisibility: boolean;
  productImage: string;
  productCondition?: string;
  warrantyPeriod?: string;
  createdAt: string;
}

const ITEMS_PER_PAGE = 50;

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

export default function ProductsTable() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductsProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [warranty, setWarranty] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeletePid, setPendingDeletePid] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });
      
      if (search.trim()) params.append('search', search.trim());
      if (category) params.append('category', category);
      if (brand.trim()) params.append('brand', brand.trim());
      if (visibility) params.append('visibility', visibility);
      if (condition) params.append('condition', condition);
      if (warranty) params.append('warranty', warranty);
      if (priceMin) params.append('priceMin', priceMin);
      if (priceMax) params.append('priceMax', priceMax);

      const response = await fetch(`/api/get-data/store?${params.toString()}`);
      const data = await response.json();

      if (!response.ok || data.statusx === 'ERROR') throw new Error(data.message || 'Sync failed');

      setProducts(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, brand, visibility, condition, warranty, priceMin, priceMax]);

  useEffect(() => {
    const handler = setTimeout(fetchProducts, 300);
    return () => clearTimeout(handler);
  }, [fetchProducts]);

  const clearFilters = () => {
    setSearch(''); setCategory(''); setBrand(''); setVisibility('');
    setCondition(''); setWarranty(''); setPriceMin(''); setPriceMax('');
    setPage(1);
  };

  const hasActiveFilters = search || category || brand || visibility || condition || warranty || priceMin || priceMax;

  const handleToggleVisibility = async (pidProduct: string, currentVisibility: boolean) => {
    const newVisibility = !currentVisibility;
    toast.info(`Updating visibility...`);
    try {
      const res = await fetch('/api/crud/store/toggle-visibility', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pidProduct, productVisibility: newVisibility }),
      });
      const data = await res.json();
      if (data.statusx === 'SUCCESS') {
        toast.success(`Product is now ${newVisibility ? 'visible' : 'hidden'}`);
        setProducts(prev => prev.map(p => p.pidProduct === pidProduct ? { ...p, productVisibility: newVisibility } : p));
      }
    } catch (err) {
      toast.error('Sync failed');
    }
  };

  const handleDelete = async () => {
    if (!pendingDeletePid) return;
    toast.info('Archiving product...');
    try {
      const res = await fetch(`/api/crud/store/delete?pidProduct=${pendingDeletePid}`);
      const data = await res.json();
      if (data.statusx === 'SUCCESS') {
        toast.success('Product archived');
        fetchProducts();
      }
    } finally {
      setShowDeleteConfirm(false);
      setPendingDeletePid(null);
    }
  };

  const requestDelete = (pidProduct: string) => {
    setPendingDeletePid(pidProduct);
    setShowDeleteConfirm(true);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(value) || 0);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Control Bar & Search */}
      <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:max-w-3xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search catalog by name, brand, or PID..."
              className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-xs font-bold border transition-all ${
              hasActiveFilters ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-background border-border text-foreground hover:bg-muted'
            }`}
          >
            <Filter className="w-3.5 h-3.5" /> 
            Filters {hasActiveFilters && `(${[category, brand, visibility, condition, warranty, priceMin, priceMax].filter(Boolean).length})`}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="px-4 py-2 text-xs font-bold text-destructive hover:bg-destructive/5 rounded-md transition-colors">
              Reset
            </button>
          )}
        </div>
        
        <button
          onClick={() => router.push('/dashboard/store/add')}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* 2. Advanced Filter Panel */}
      {showFilters && (
        <div className="bg-muted/30 border border-border rounded-lg p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</label>
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs border border-input rounded bg-background">
              <option value="">All Categories</option>
              <option value="laptop">Laptop</option>
              <option value="phone">Phone</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Visibility</label>
            <select value={visibility} onChange={(e) => { setVisibility(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs border border-input rounded bg-background">
              <option value="">Status All</option>
              <option value="true">Live Only</option>
              <option value="false">Hidden Only</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Condition</label>
            <select value={condition} onChange={(e) => { setCondition(e.target.value); setPage(1); }} className="w-full px-3 py-2 text-xs border border-input rounded bg-background">
              <option value="">Condition All</option>
              <option value="BRAND_NEW">Brand New</option>
              <option value="REFURBISHED">Refurbished</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Price Range (₦)</label>
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Min" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="w-full px-2 py-2 text-xs border border-input rounded bg-background" />
              <span className="text-muted-foreground">-</span>
              <input type="number" placeholder="Max" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="w-full px-2 py-2 text-xs border border-input rounded bg-background" />
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Product Ledger */}
      <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4 w-16 text-center">S/N</th>
                <th className="px-6 py-4">Visual</th>
                <th className="px-6 py-4">Product Specifications</th>
                <th className="px-6 py-4 text-right">Retail Price</th>
                <th className="px-6 py-4">Classification</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <RefreshCw className="w-8 h-8 text-muted-foreground/40 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground tracking-tight">Syncing catalog data...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">No products match your current filters.</p>
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr key={product.pidProduct} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 text-center text-muted-foreground font-medium">
                      {(page - 1) * ITEMS_PER_PAGE + index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 relative bg-muted rounded-md border border-border overflow-hidden">
                        {(() => {
                          const imageSrc = resolveProductImageSrc(product.productImage);
                          if (!imageSrc) {
                            return (
                              <div className="h-full w-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground/40" />
                              </div>
                            );
                          }
                          return (
                            <Image
                              src={imageSrc}
                              alt={product.productName}
                              fill
                              className="object-contain p-1"
                            />
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground text-sm line-clamp-1">{product.productName}</span>
                        <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded w-fit">PID: {product.pidProduct}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-foreground">
                      {formatCurrency(product.productPrice)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Tag className="w-3 h-3 text-primary" /> {product.productBrand}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{product.productCategory}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleVisibility(product.pidProduct, product.productVisibility)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          product.productVisibility
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        }`}
                      >
                        {product.productVisibility ? <><Eye className="w-3 h-3" /> Live</> : <><EyeOff className="w-3 h-3" /> Hidden</>}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <button onClick={() => router.push(`/dashboard/store/details?id=${product.pidProduct}`)} className="p-2 text-muted-foreground hover:text-primary transition-colors border border-transparent hover:border-primary/20 rounded-md" title="View Full Specs">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => router.push(`/dashboard/store/edit?id=${product.pidProduct}`)} className="p-2 text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border rounded-md" title="Edit Catalog Data">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button onClick={() => requestDelete(product.pidProduct)} className="p-2 text-destructive/40 hover:text-destructive transition-colors border border-transparent hover:border-destructive/20 rounded-md" title="Archive Product">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Pagination System */}
      {totalCount > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-1">
          <p className="text-xs font-medium text-muted-foreground">
            Displaying <span className="text-foreground font-bold">{(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, totalCount)}</span> of {totalCount} assets
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="p-2 border border-border rounded-md bg-card hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-xs font-bold uppercase tracking-widest text-foreground">Page {page} / {totalPages}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="p-2 border border-border rounded-md bg-card hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 5. Custom Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-soft p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-destructive/10 rounded-full text-destructive">
                 <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold tracking-tight text-foreground">Archive Product?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are about to remove this asset from the store catalog. This will immediately hide it from all customers and affiliates.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-foreground border border-border rounded-md hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-destructive rounded-md hover:bg-destructive/90 shadow-sm transition-all"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
