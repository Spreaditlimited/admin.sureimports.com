'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Users,
  UserCheck,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  Calendar,
  ShoppingBag,
  RefreshCw,
  Globe,
} from 'lucide-react';

interface Customer {
  id: number;
  pidUser: string;
  userFirstname: string | null;
  userLastname: string | null;
  userEmail: string;
  email: string | null;
  phone: string | null;
  userPhone: string | null;
  country: string | null;
  userState: string | null;
  address: string | null;
  userCid: string | null;
  userStatus: string | null;
  userImage: string | null;
  userAffiliateCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  _count: {
    orders: number;
    wallets: number;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Stats {
  total: number;
  active: number;
  registered: number;
}

export default function CustomersTable() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'registered'>('all');
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 20,
    hasNext: false,
    hasPrev: false,
  });
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, registered: 0 });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
      });
      if (search) params.append('search', search);

      const response = await fetch(`/api/crud/customers/fetch?${params}`);
      const data = await response.json();

      if (data.successx) {
        setCustomers(data.data);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        toast.error(data.responsex?.message || 'Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchCustomers();
  };

  const handleViewDetails = (pidUser: string) => {
    router.push(`/dashboard/customer-accounts/customers/details?pidUser=${pidUser}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (userCid: string | null) => {
    if (userCid === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Registered
      </span>
    );
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'NA';
  };

  return (
    <div className="space-y-6">
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Customers Card */}
        <div
          onClick={() => {
            setStatusFilter('all');
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
          }}
          className={`cursor-pointer p-6 rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring ${
            statusFilter === 'all'
              ? 'bg-primary/5 border-primary text-primary'
              : 'bg-card border-border hover:bg-muted/30'
          }`}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-medium ${statusFilter === 'all' ? 'text-primary' : 'text-muted-foreground'}`}>Total Customers</span>
              <span className="text-3xl font-bold text-foreground">{stats.total.toLocaleString()}</span>
            </div>
            <div className={`p-3 rounded-full ${statusFilter === 'all' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Customers Card */}
        <div
          onClick={() => {
            setStatusFilter('active');
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
          }}
          className={`cursor-pointer p-6 rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            statusFilter === 'active'
              ? 'bg-emerald-500/5 border-emerald-500 text-emerald-600'
              : 'bg-card border-border hover:bg-muted/30'
          }`}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-medium ${statusFilter === 'active' ? 'text-emerald-600' : 'text-muted-foreground'}`}>Active Customers</span>
              <span className="text-3xl font-bold text-foreground">{stats.active.toLocaleString()}</span>
            </div>
            <div className={`p-3 rounded-full ${statusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Registered Customers Card */}
        <div
          onClick={() => {
            setStatusFilter('registered');
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
          }}
          className={`cursor-pointer p-6 rounded-lg border shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 ${
            statusFilter === 'registered'
              ? 'bg-amber-500/5 border-amber-500 text-amber-600'
              : 'bg-card border-border hover:bg-muted/30'
          }`}
          role="button"
          tabIndex={0}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span className={`text-sm font-medium ${statusFilter === 'registered' ? 'text-amber-600' : 'text-muted-foreground'}`}>Registered Only</span>
              <span className="text-3xl font-bold text-foreground">{stats.registered.toLocaleString()}</span>
            </div>
            <div className={`p-3 rounded-full ${statusFilter === 'registered' ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
              <UserPlus className="w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* Control Bar: Search & Refresh */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
                className="w-full pl-9 pr-4 py-2 border border-input rounded-md bg-background text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
              />
            </div>
          </form>

          <button
            onClick={() => fetchCustomers()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-background border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-center">Orders</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border bg-card">
              
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
                      <p className="text-sm font-medium text-muted-foreground">Loading customer data...</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-muted-foreground">No customers found.</p>
                      {search && (
                        <button
                          onClick={() => {
                            setSearch('');
                            setPagination((prev) => ({ ...prev, currentPage: 1 }));
                          }}
                          className="text-sm font-semibold text-primary hover:underline focus:outline-none"
                        >
                          Clear search filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    
                    {/* Customer Profile Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {customer.userImage ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${customer.userImage}`}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(customer.userFirstname, customer.userLastname)
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-foreground">
                            {customer.userFirstname || ''} {customer.userLastname || ''}
                            {!customer.userFirstname && !customer.userLastname && (
                              <span className="text-muted-foreground italic">No Name Provided</span>
                            )}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            ID: {customer.pidUser.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Column */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-sm">
                        <div className="flex items-center gap-2 text-foreground">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[150px]">{customer.userEmail || customer.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{customer.phone || customer.userPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Location Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">
                            {customer.country || 'N/A'}
                          </span>
                          {customer.userState && (
                            <span className="text-xs text-muted-foreground">{customer.userState}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Orders Column */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border">
                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm font-bold text-foreground">
                          {customer._count.orders}
                        </span>
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4">
                      {getStatusBadge(customer.userCid)}
                    </td>

                    {/* Date Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>{formatDate(customer.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action Column */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(customer.pidUser)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-background border border-border hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Custom Pagination System */}
        {!loading && customers.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-muted/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              
              <p className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-semibold text-foreground">
                  {(pagination.currentPage - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-foreground">
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
                </span>{' '}
                of <span className="font-semibold text-foreground">{pagination.totalCount}</span> customers
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                  disabled={!pagination.hasPrev}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border border-border bg-background rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                
                <div className="hidden sm:flex items-center gap-1 px-2">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPagination((prev) => ({ ...prev, currentPage: pageNum }))}
                        className={`w-9 h-9 flex items-center justify-center text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                          pagination.currentPage === pageNum
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                  disabled={!pagination.hasNext}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border border-border bg-background rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}