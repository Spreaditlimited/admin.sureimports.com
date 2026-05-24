'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { Edit, List, PlusCircle, Trash, Filter, Search, X, Eye, EyeOff } from 'lucide-react';

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

export default function ProductsTable() {
  const navigateWithAlert = useNavigationWithAlert();
  const router = useRouter();

  // State for data and loading
  const [products, setProducts] = useState<ProductsProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [visibility, setVisibility] = useState<string>('');
  const [condition, setCondition] = useState<string>('');
  const [warranty, setWarranty] = useState<string>('');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // State for pagination
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

      console.log('Fetching with params:', params.toString());

      const response = await fetch(`/api/get-data/store?${params.toString()}`);
      const data = await response.json();

      console.log('API Response:', data);

      if (!response.ok || data.statusx === 'ERROR') {
        throw new Error(data.message || 'Failed to fetch products');
      }

      setProducts(data.data || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products. Please try again.');
      console.error('Fetch error:', err);
      setProducts([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, brand, visibility, condition, warranty, priceMin, priceMax]);

  // Debounced fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(handler);
  }, [fetchProducts]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setter(value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setBrand('');
    setVisibility('');
    setCondition('');
    setWarranty('');
    setPriceMin('');
    setPriceMax('');
    setPage(1);
  };

  const hasActiveFilters = search || category || brand || visibility || condition || warranty || priceMin || priceMax;

  const handleToggleVisibility = async (pidProduct: string, currentVisibility: boolean) => {
    const newVisibility = !currentVisibility;
    const action = newVisibility ? 'visible' : 'hidden';
    
    toast.info(`Setting product as ${action}...`);
    try {
      const response = await fetch('/api/crud/store/toggle-visibility', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pidProduct,
          productVisibility: newVisibility,
        }),
      });

      const data = await response.json();

      if (data.statusx === 'SUCCESS') {
        toast.success(`Product is now ${action}`);
        // Update local state immediately for better UX
        setProducts(prev => 
          prev.map(p => 
            p.pidProduct === pidProduct 
              ? { ...p, productVisibility: newVisibility }
              : p
          )
        );
      } else {
        toast.error(data.message || 'Failed to update visibility');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while updating visibility.');
    }
  };

  const handleDelete = async (pidProduct: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    toast.info('Deleting Product...');
    try {
      const response = await fetch(`/api/crud/store/delete?pidProduct=${pidProduct}`);
      const data = await response.json();
      
      if (data.statusx === 'SUCCESS') {
        toast.success(data.message);
        fetchProducts();
      } else {
        toast.error(data.message || 'Failed to delete product');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during deletion.');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <>
      <div className="w-full overflow-x-auto shadow-md sm:rounded-lg bg-white dark:bg-gray-900">
        {/* Header Section */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Products Management</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage your product inventory
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard/store/add')}
              className="btn bg-slate-600 hover:bg-slate-700 inline-flex items-center gap-2 py-2.5 px-4 text-sm font-medium rounded-lg text-white transition-colors"
            >
              <PlusCircle size={18} /> Add New Product
            </button>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                placeholder="Search by product name, brand, or ID..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  hasActiveFilters 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <Filter size={16} /> 
                Filters
                {hasActiveFilters && (
                  <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
                    {[search, category, brand, visibility, condition, warranty, priceMin, priceMax].filter(Boolean).length}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium transition-colors"
                >
                  <X size={16} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => handleFilterChange(setCategory, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Categories</option>
                    <option value="laptop">Laptop</option>
                    <option value="phone">Phone</option>
                    <option value="accessories">Accessories</option>
                    <option value="watch">Watch</option>
                    <option value="tablet">Tablet</option>
                    <option value="computer">Computer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Brand
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => handleFilterChange(setBrand, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Brands</option>
                    <option value="hp">HP</option>
                    <option value="dell">DELL</option>
                    <option value="asus">ASUS</option>
                    <option value="acer">ACER</option>
                    <option value="lenovo">LENOVO</option>
                    <option value="apple">APPLE</option>
                    <option value="samsung">SAMSUNG</option>
                    <option value="google">GOOGLE</option>
                    <option value="microsoft">MICROSOFT</option>
                    <option value="faya">FAYA</option>
                    <option value="kainene">Kainene</option>
                    <option value="skmei">Skmei</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => handleFilterChange(setVisibility, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Products</option>
                    <option value="true">Visible Only</option>
                    <option value="false">Hidden Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => handleFilterChange(setCondition, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Conditions</option>
                    <option value="BRAND_NEW">Brand New</option>
                    <option value="PRE_OWNED">Pre-Owned</option>
                    <option value="REFURBISHED">Refurbished</option>
                    <option value="OPEN_BOX">Open Box</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Warranty Period
                  </label>
                  <select
                    value={warranty}
                    onChange={(e) => handleFilterChange(setWarranty, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">All Warranties</option>
                    <option value="MONTHS3">3 Months</option>
                    <option value="MONTHS6">6 Months</option>
                    <option value="MONTHS12">12 Months</option>
                    <option value="MONTHS24">24 Months</option>
                    <option value="MONTHS36">36 Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min Price (₦)
                  </label>
                  <input
                    type="number"
                    value={priceMin}
                    onChange={(e) => handleFilterChange(setPriceMin, e.target.value)}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Price (₦)
                  </label>
                  <input
                    type="number"
                    value={priceMax}
                    onChange={(e) => handleFilterChange(setPriceMax, e.target.value)}
                    placeholder="1000000"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Info */}
          <div className="mt-4 flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
            <div>
              Showing <span className="font-semibold text-gray-900 dark:text-white">{products.length > 0 ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{Math.min(page * ITEMS_PER_PAGE, totalCount)}</span> of{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{totalCount}</span> products
            </div>
            <div className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full dark:bg-blue-900 dark:text-blue-200">
              {ITEMS_PER_PAGE} per page
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading products...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="text-red-500 text-lg mb-4">{error}</div>
            <button
              onClick={fetchProducts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">S/N</th>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Brand / Category</th>
                  <th className="px-6 py-4">Visibility</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((product, index) => (
                    <tr
                      key={product.pidProduct}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {(page - 1) * ITEMS_PER_PAGE + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-20 h-20 relative bg-gray-100 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                          <Image
                            src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${product.productImage}`}
                            alt={product.productName}
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {product.productName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ID: {product.pidProduct}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 dark:text-white">
                          ₦{parseFloat(product.productPrice).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {product.productBrand}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {product.productCategory}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleVisibility(product.pidProduct, product.productVisibility)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            product.productVisibility
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800'
                              : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800'
                          }`}
                          title={product.productVisibility ? 'Click to hide' : 'Click to show'}
                        >
                          {product.productVisibility ? (
                            <>
                              <Eye size={14} /> Visible
                            </>
                          ) : (
                            <>
                              <EyeOff size={14} /> Hidden
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-3">
                          <a
                            href={`/dashboard/store/details?id=${product.pidProduct}`}
                            title="View Details"
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <List size={18} />
                          </a>
                          <a
                            href={`/dashboard/store/edit?id=${product.pidProduct}`}
                            title="Edit Product"
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Edit size={18} />
                          </a>
                          <button
                            onClick={() => handleDelete(product.pidProduct)}
                            title="Delete Product"
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                          <List className="w-10 h-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          No products found
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          {hasActiveFilters ? 'Try adjusting your filters' : 'Get started by adding your first product'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalCount > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              First
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-2 text-sm border rounded-md ${
                      page === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              Next
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page === totalPages}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              Last
            </button>
          </div>
        </div>
      )}
    </>
  );
}
