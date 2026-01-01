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
  MapPin,
  Calendar,
  ShoppingBag,
  RefreshCw,
  Filter,
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => {
            setStatusFilter('all');
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
          }}
          className={`cursor-pointer p-5 rounded-xl border transition-all ${
            statusFilter === 'all'
              ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-900/20 dark:border-indigo-700'
              : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Customers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-xl">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('active');
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
          }}
          className={`cursor-pointer p-5 rounded-xl border transition-all ${
            statusFilter === 'active'
              ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-700'
              : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Customers</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div
          onClick={() => {
            setStatusFilter('registered');
            setPagination((prev) => ({ ...prev, currentPage: 1 }));
          }}
          className={`cursor-pointer p-5 rounded-xl border transition-all ${
            statusFilter === 'registered'
              ? 'bg-amber-50 border-amber-300 dark:bg-amber-900/20 dark:border-amber-700'
              : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Registered Only</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.registered.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <UserPlus className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 w-full sm:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, or country..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </form>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchCustomers()}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Orders
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
                      <p className="text-gray-500 dark:text-gray-400">Loading customers...</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-500 dark:text-gray-400">No customers found</p>
                      {search && (
                        <button
                          onClick={() => {
                            setSearch('');
                            setPagination((prev) => ({ ...prev, currentPage: 1 }));
                          }}
                          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                          {customer.userImage ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${customer.userImage}`}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(customer.userFirstname, customer.userLastname)
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {customer.userFirstname || ''} {customer.userLastname || ''}
                            {!customer.userFirstname && !customer.userLastname && (
                              <span className="text-gray-400">No name</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {customer.pidUser.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate max-w-[180px]">{customer.userEmail || customer.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{customer.phone || customer.userPhone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {customer.country || 'N/A'}
                          </p>
                          {customer.userState && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{customer.userState}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {customer._count.orders}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(customer.userCid)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(customer.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewDetails(customer.pidUser)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && customers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.currentPage - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
                </span>{' '}
                of <span className="font-medium">{pagination.totalCount}</span> customers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))
                  }
                  disabled={!pagination.hasPrev}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
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
                        className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                          pagination.currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))
                  }
                  disabled={!pagination.hasNext}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
