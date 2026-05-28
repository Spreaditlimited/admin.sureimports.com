'use client';

import React, { useEffect, useState } from 'react';
import AnimateHeight from 'react-animate-height';
import TableProcurementProducts from './TableProcurementProducts';
import Loader from '@/app/uix/Loader';
import { useSearchParams } from 'next/navigation';
import { CornerRightDown } from 'lucide-react';
import { getTimeDifference } from '@/lib/getTimeDifference';
import { toast } from 'sonner';

interface Product {
  id: number;
  pidProduct: string;
  pidOrder: string;
  pidUser: string;
  productName: string;
  productLink: string;
  productCategory: string;
  productPrice: string;
  productWeight: string;
  productQuantity: string;
  productInfo: string;
  productStatus: string;
}

interface Order {
  id: any;
  pidOrder: string;
  pidUser: string;
  orderName: string;
  destinationCountry: string;
  currencyType: string;
  shippingPlan: string;
  orderCategory: string;
  shippingAddress: string;
  status: string;
  createdAt: string;
  updatedAt: string; // Added to interface based on your usage
  products: Product[];
  user: User; // Added based on your usage
}

interface User {
  id: any;
  pidUser: string;
  userFirstname: string;
  userLastname: string;
  userEmail: string;
  userPassword: string;
  userSession: string;
  cidStatus: string;
  loginStatus: string;
  loginKey: string;
  loginStamp: string;
  gender: string;
  dob: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  ref_id: string;
  userPhone: string;
  userCid: string;
  userShippingAddress: string;
  userShippingAddress2: string;
  userCountry: string;
  userState: string;
  userAffiliateCode: string;
  userAffiliateRef: string;
  userStatus: string;
  userImage: string;
}

// A reusable mini-component for the Customer Details grid to keep code DRY
const DetailItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col">
    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
      {label}
    </span>
    <span className="text-sm font-semibold text-foreground">
      {value}
    </span>
  </div>
);

const ComponentsAccordionsBasic = () => {
  // VARIABLES
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  
  const status = useSearchParams().get('status') || 'none';
  const [orderALL, setOrderALL] = useState<Order[]>([]);
  const [cleanupRunning, setCleanupRunning] = useState(false);

  const togglePara = (value: string) => {
    setActive((oldValue) => (oldValue === value ? '' : value));
  };

  // GET RECORDS FROM DATABASE
  async function fetchDataOrder() {
    try {
      const res = await fetch(`/api/get-data/order-many?status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setOrderALL(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  // FETCH ORDERS AND PRODUCTS
  useEffect(() => {
    setLoading(true);
    fetchDataOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // LOADER
  if (loading) return <Loader />;

  // EMPTY RECORD PROCESSING
  if (orderALL.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 bg-card border border-border shadow-soft rounded-lg mt-4">
        <p className="text-muted-foreground font-medium text-center">
          No {status} orders available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page / Section Title */}
      <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {status} Orders
        </h2>
        <button
          type="button"
          disabled={cleanupRunning}
          onClick={async () => {
            setCleanupRunning(true);
            try {
              const res = await fetch('/api/cron/cleanup-saved-orders');
              const data = await res.json();
              if (!res.ok || data.statusx !== 'SUCCESS') {
                toast.error(data?.message || 'Cleanup failed');
                return;
              }
              toast.success(`Cleanup completed. Deleted ${data.deletedCount || 0} stale saved orders.`);
              fetchDataOrder();
            } catch {
              toast.error('Cleanup failed');
            } finally {
              setCleanupRunning(false);
            }
          }}
          className="inline-flex items-center justify-center rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
        >
          {cleanupRunning ? 'Running Cleanup...' : 'Run Cleanup Now'}
        </button>
      </div>

      {orderALL.map((datax, index) => {
        const itemKey = `${index + 1}`;
        const isActive = active === itemKey;

        return (
          <div
            key={itemKey}
            className="bg-card border border-border shadow-soft rounded-lg overflow-hidden transition-all duration-200"
          >
            {/* Accordion Header (Trigger) */}
            <button
              type="button"
              className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${
                isActive ? 'bg-muted/30' : 'hover:bg-muted/50'
              }`}
              onClick={() => togglePara(itemKey)}
            >
              {/* Left Side: Title and ID */}
              <div className="flex flex-col gap-1 mb-3 sm:mb-0">
                <span className={`text-base font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                  #{index + 1} : {datax.orderName}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  Order ID: {datax.pidOrder}
                </span>
              </div>

              {/* Right Side: Dates & Icon */}
              <div className="flex items-center justify-between sm:justify-end gap-6">
                <div className="flex flex-col sm:items-end text-xs text-muted-foreground">
                  <span>Updated: {getTimeDifference(datax.updatedAt)}</span>
                  <span>Created: {getTimeDifference(datax.createdAt)}</span>
                </div>
                
                <div className={`text-muted-foreground transition-transform duration-300 ${isActive ? 'rotate-180 text-primary' : ''}`}>
                  <CornerRightDown className="w-5 h-5" />
                </div>
              </div>
            </button>

            {/* Accordion Content */}
            <AnimateHeight duration={300} height={isActive ? 'auto' : 0}>
              <div className="border-t border-border p-4 sm:p-6 bg-background/50 space-y-6">
                
                {/* Customer Details Panel */}
                <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">
                    Customer Details
                  </h4>
                  
                  {/* CSS Grid for structured, responsive data display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-6 gap-x-4">
                    <DetailItem label="Customer ID" value={datax.user.pidUser} />
                    <DetailItem 
                      label="Full Name" 
                      value={`${datax.user.userFirstname} ${datax.user.userLastname}`} 
                    />
                    <DetailItem label="Email" value={datax.user.userEmail || 'N/A'} />
                    <DetailItem label="Gender" value={datax.user.gender || 'N/A'} />
                    <DetailItem 
                      label="Phone" 
                      value={`${datax.user.userPhone || ''} ${datax.user.phone || ''}`.trim() || 'N/A'} 
                    />
                    <DetailItem 
                      label="Country" 
                      value={`${datax.user.userCountry || ''} ${datax.user.country || ''}`.trim() || 'N/A'} 
                    />
                    <div className="sm:col-span-2 md:col-span-3 xl:col-span-2">
                       <DetailItem label="Address" value={datax.user.address || 'N/A'} />
                    </div>
                  </div>
                </div>

                {/* Products Table Component */}
                <TableProcurementProducts
                  pidOrder={datax.pidOrder}
                  pidUser={datax.pidUser}
                  orderName={datax.orderName}
                  shippingAddress={datax.shippingAddress}
                />
                
              </div>
            </AnimateHeight>
          </div>
        );
      })}
    </div>
  );
};

export default ComponentsAccordionsBasic;
