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

// Reusable Detail Item to keep JSX clean
const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | null }) => (
  <div className="flex items-start gap-3">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="flex flex-col">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || 'N/A'}</span>
    </div>
  </div>
);

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
      month: 'short',
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
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <Clock className="w-3.5 h-3.5" />
        Registered
      </span>
    );
  };

  const getOrderStatusBadge = (status: string | null) => {
    const s = status?.toLowerCase() || '';
    let style = 'bg-muted text-muted-foreground border-border';
    
    if (s === 'pending') style = 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    else if (s === 'processing') style = 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    else if (s === 'shipped') style = 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    else if (s === 'delivered') style = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    else if (s === 'cancelled') style = 'bg-destructive/10 text-destructive border-destructive/20';

    return (
      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${style}`}>
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-card border border-border rounded-lg shadow-sm">
        <div className="text-center">
          <User className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground mb-1">Customer Not Found</h2>
          <p className="text-sm text-muted-foreground mb-6">The requested customer could not be found or has been removed.</p>
          <button
            onClick={() => router.push('/dashboard/customer-accounts/customers')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/customer-accounts/customers')}
            className="p-2 border border-border bg-card hover:bg-muted text-muted-foreground rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Customer Profile</h1>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">View complete customer information and history</p>
          </div>
        </div>
        <div>
          {getStatusBadge(customer.userCid)}
        </div>
      </div>

      {/* Customer Hero Card */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="bg-muted/40 border-b border-border h-24 relative">
          <div className="absolute -bottom-10 left-6">
            <div className="w-20 h-20 rounded-full border-4 border-card bg-primary/10 flex items-center justify-center text-primary text-xl font-bold shadow-sm">
              {customer.userImage ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL}/${customer.userImage}`}
                  alt="Customer avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials(customer.userFirstname, customer.userLastname)
              )}
            </div>
          </div>
        </div>
        <div className="pt-14 px-6 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold text-foreground">
                {customer.userFirstname || ''} {customer.userLastname || ''}
                {!customer.userFirstname && !customer.userLastname && <span className="italic text-muted-foreground">No name provided</span>}
              </h2>
              <p className="text-sm font-mono text-muted-foreground">
                ID: {customer.pidUser}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-3/5">
              <div className="bg-muted/30 border border-border rounded-md p-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-foreground">{stats?.totalOrders || 0}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Orders</span>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-foreground">{customer._count.wallets}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wallets</span>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-3 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-foreground">{customer._count.accounts}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Accounts</span>
              </div>
              <div className="bg-muted/30 border border-border rounded-md p-3 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-bold text-primary truncate w-full">
                  {formatCurrency(stats?.totalPayments || 0)}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Spent</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Core Info */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Contact Information */}
          <div className="bg-card border border-border shadow-sm rounded-lg p-5 sm:p-6">
            <h3 className="text-sm font-bold text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
              <DetailItem icon={Mail} label="Email" value={customer.userEmail || customer.email} />
              <DetailItem icon={Phone} label="Phone" value={customer.phone || customer.userPhone} />
              <DetailItem icon={Globe} label="Country" value={customer.country} />
              <DetailItem icon={Building} label="State" value={customer.userState} />
              <div className="sm:col-span-2">
                <DetailItem icon={MapPin} label="Address" value={customer.address} />
              </div>
              {customer.userShippingAddress && (
                <div className="sm:col-span-2 pt-4 border-t border-border">
                  <DetailItem icon={Package} label="Shipping Address" value={customer.userShippingAddress} />
                </div>
              )}
            </div>
          </div>

          {/* Bank Information */}
          {(customer.bank_name || customer.bank_account_number) && (
            <div className="bg-card border border-border shadow-sm rounded-lg p-5 sm:p-6">
              <h3 className="text-sm font-bold text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Bank Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bank Name</span>
                  <span className="text-sm font-semibold text-foreground">{customer.bank_name || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Number</span>
                  <span className="text-sm font-mono text-foreground tracking-wide">{customer.bank_account_number || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Name</span>
                  <span className="text-sm font-semibold text-foreground">{customer.bank_account_name || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Orders */}
          <div className="bg-card border border-border shadow-sm rounded-lg p-5 sm:p-6">
            <h3 className="text-sm font-bold text-foreground mb-5 pb-3 border-b border-border flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
              Recent Orders
            </h3>
            
            {customer.orders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No orders found for this customer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customer.orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-muted/30 border border-border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-background border border-border rounded-md shrink-0 mt-0.5">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                          {order.orderName || order.pidOrder}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground mt-0.5">
                          {formatDate(order.createdAt)} • {order.destinationCountry || 'No Destination'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto">
                      <span className="text-sm font-bold text-foreground">
                        {order.currencyType} {order.orderTotalCost || '0.00'}
                      </span>
                      {getOrderStatusBadge(order.orderStatus)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Secondary Info */}
        <div className="space-y-6">
          
          {/* Account Details */}
          <div className="bg-card border border-border shadow-sm rounded-lg p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Account Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Joined Date</span>
                <span className="font-semibold text-foreground">{formatDate(customer.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Last Updated</span>
                <span className="font-semibold text-foreground">{formatDate(customer.updatedAt)}</span>
              </div>
              {customer.gender && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Gender</span>
                  <span className="font-semibold text-foreground capitalize">{customer.gender}</span>
                </div>
              )}
              {customer.dob && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground font-medium">Date of Birth</span>
                  <span className="font-semibold text-foreground">{customer.dob}</span>
                </div>
              )}
            </div>
          </div>

          {/* Affiliate Information */}
          {(customer.userAffiliateCode || customer.userAffiliateRef) && (
            <div className="bg-card border border-border shadow-sm rounded-lg p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <Link2 className="w-4 h-4 text-muted-foreground" />
                Affiliate Info
              </h3>
              <div className="space-y-4">
                {customer.userAffiliateCode && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Affiliate Code</span>
                    <span className="text-sm font-mono font-semibold text-primary bg-primary/5 border border-primary/20 px-3 py-1.5 rounded-md inline-block w-max">
                      {customer.userAffiliateCode}
                    </span>
                  </div>
                )}
                {customer.userAffiliateRef && (
                  <div className="flex flex-col gap-1.5 pt-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Referred By</span>
                    <span className="text-sm font-semibold text-foreground">{customer.userAffiliateRef}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wallets */}
          {customer.wallets.length > 0 && (
            <div className="bg-card border border-border shadow-sm rounded-lg p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                Wallets
              </h3>
              <div className="space-y-3">
                {customer.wallets.map((wallet) => (
                  <div key={wallet.id} className="p-3 bg-muted/30 border border-border rounded-md flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{wallet.name}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{wallet.type}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(wallet.balance, wallet.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Payments */}
          {recentPayments.length > 0 && (
            <div className="bg-card border border-border shadow-sm rounded-lg p-5">
              <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {recentPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-md">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(payment.amount, payment.currency || 'NGN')}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground mt-0.5">{formatDate(payment.createdAt)}</span>
                    </div>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        payment.paymentStatus === 'success'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border-border'
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <CustomerDetailsContent />
    </Suspense>
  );
}