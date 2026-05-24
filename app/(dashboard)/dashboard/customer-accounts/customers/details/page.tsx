'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ShoppingBag,
  Wallet,
  CreditCard,
  Globe,
  Building,
  CheckCircle2,
  Clock,
  Package,
  DollarSign,
  Link2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface CustomerData {
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
  userShippingAddress: string | null;
  userShippingAddress2: string | null;
  userCid: string | null;
  userStatus: string | null;
  userImage: string | null;
  userAffiliateCode: string | null;
  userAffiliateRef: string | null;
  gender: string | null;
  dob: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  orders: Array<{
    id: number;
    pidOrder: string;
    orderName: string | null;
    destinationCountry: string | null;
    orderStatus: string | null;
    orderTotalCost: string | null;
    currencyType: string | null;
    createdAt: string | null;
  }>;
  wallets: Array<{
    id: string;
    name: string;
    type: string;
    currency: string;
    balance: number;
  }>;
  accounts: Array<{
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    balance: number | null;
    currency: string | null;
  }>;
  _count: {
    orders: number;
    wallets: number;
    accounts: number;
    paysmallsmall: number;
  };
}

interface Stats {
  totalOrders: number;
  totalPayments: number;
}

interface RecentPayment {
  amount: number;
  currency: string | null;
  paymentStatus: string | null;
  createdAt: string | null;
}

function CustomerDetailsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pidUser = searchParams.get('pidUser');

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pidUser) {
      toast.error('Customer ID is required');
      router.push('/dashboard/customer-accounts/customers');
      return;
    }

    const fetchCustomerDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/crud/customers/details?pidUser=${pidUser}`);
        const data = await response.json();

        if (data.successx) {
          setCustomer(data.data.customer);
          setStats(data.data.stats);
          setRecentPayments(data.data.recentPayments || []);
        } else {
          toast.error(data.responsex?.message || 'Failed to fetch customer details');
          router.push('/dashboard/customer-accounts/customers');
        }
      } catch (error) {
        console.error('Error fetching customer details:', error);
        toast.error('Failed to fetch customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [pidUser, router]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | string | null, currency: string = 'NGN') => {
    if (amount === null) return 'N/A';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
    }).format(numAmount || 0);
  };

  const getStatusBadge = (status: string | null) => {
    if (status === 'VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          Active Customer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="w-4 h-4" />
        Registered
      </span>
    );
  };

  const getOrderStatusBadge = (status: string | null) => {
    const statusStyles: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    const style = statusStyles[status?.toLowerCase() || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

    return (
      <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${style}`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0)?.toUpperCase() || '';
    const last = lastName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'NA';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Customer Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">The requested customer could not be found.</p>
            <button
              onClick={() => router.push('/dashboard/customer-accounts/customers')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/customer-accounts/customers')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Details</h1>
            <p className="text-gray-600 dark:text-gray-400">View complete customer information</p>
          </div>
        </div>
        {getStatusBadge(customer.userCid)}
      </div>

      {/* Customer Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-32 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
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
          </div>
        </div>
        <div className="pt-16 px-6 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer.userFirstname || ''} {customer.userLastname || ''}
                {!customer.userFirstname && !customer.userLastname && 'No name provided'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Customer ID: {customer.pidUser}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.totalOrders || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Orders</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{customer._count.wallets}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Wallets</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{customer._count.accounts}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Accounts</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(stats?.totalPayments || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-gray-900 dark:text-white">{customer.userEmail || customer.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-gray-900 dark:text-white">{customer.phone || customer.userPhone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Country</p>
                  <p className="text-gray-900 dark:text-white">{customer.country || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">State</p>
                  <p className="text-gray-900 dark:text-white">{customer.userState || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 sm:col-span-2">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                  <p className="text-gray-900 dark:text-white">{customer.address || 'N/A'}</p>
                </div>
              </div>
              {customer.userShippingAddress && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Shipping Address</p>
                    <p className="text-gray-900 dark:text-white">{customer.userShippingAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank Information */}
          {(customer.bank_name || customer.bank_account_number) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Bank Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Bank Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">{customer.bank_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Account Number</p>
                  <p className="text-gray-900 dark:text-white font-medium">{customer.bank_account_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Account Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">{customer.bank_account_name || 'N/A'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              Recent Orders
            </h3>
            {customer.orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {order.orderName || order.pidOrder.slice(0, 12)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(order.createdAt)} • {order.destinationCountry || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {order.currencyType} {order.orderTotalCost || '0'}
                      </p>
                      {getOrderStatusBadge(order.orderStatus)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Additional Info */}
        <div className="space-y-6">
          {/* Account Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Account Details
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="text-gray-900 dark:text-white font-medium">{formatDate(customer.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="text-gray-900 dark:text-white font-medium">{formatDate(customer.updatedAt)}</p>
              </div>
              {customer.gender && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                  <p className="text-gray-900 dark:text-white font-medium capitalize">{customer.gender}</p>
                </div>
              )}
              {customer.dob && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p className="text-gray-900 dark:text-white font-medium">{customer.dob}</p>
                </div>
              )}
            </div>
          </div>

          {/* Affiliate Information */}
          {(customer.userAffiliateCode || customer.userAffiliateRef) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-indigo-600" />
                Affiliate Info
              </h3>
              <div className="space-y-4">
                {customer.userAffiliateCode && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Affiliate Code</p>
                    <p className="text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-900 px-3 py-2 rounded-lg">
                      {customer.userAffiliateCode}
                    </p>
                  </div>
                )}
                {customer.userAffiliateRef && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Referred By</p>
                    <p className="text-gray-900 dark:text-white font-medium">{customer.userAffiliateRef}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallets */}
          {customer.wallets.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                Wallets
              </h3>
              <div className="space-y-3">
                {customer.wallets.map((wallet) => (
                  <div key={wallet.id} className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{wallet.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{wallet.type}</p>
                      </div>
                      <p className="font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(wallet.balance, wallet.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {recentPayments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Recent Payments
              </h3>
              <div className="space-y-3">
                {recentPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payment.amount, payment.currency || 'NGN')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(payment.createdAt)}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-medium ${
                        payment.paymentStatus === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {payment.paymentStatus || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomerDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <CustomerDetailsContent />
    </Suspense>
  );
}
