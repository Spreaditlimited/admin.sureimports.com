'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

export default function CustomersTable() {
  const navigateWithAlert = useNavigationWithAlert();
  const router = useRouter();

  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // We kept your other state variables in case you need them later
  const [statusz, setStatusz] = useState<any>('ok');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [transactions, setTransaction] = useState<any | null>(null);
  const [statusx, setStatus] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/paystack/dedicated-accounts?status=ok`);
        const data: any = await response.json();

        setStatus(data.statusx);
        setMessage(data.message);
        setCustomerAccounts(data.accountDetails?.data || []);
        setTransaction(data.transactionDetails);
        setTotalAmount(data.totalAmount || 0);
      } catch (err) {
        setError('Failed to load customer accounts.');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [statusz]);

  async function handleViewDetails(pidUser: any) {
    toast.info('Opening customer details...');
    // Add your navigation or fetch logic here
    // Example: router.push(`/dashboard/customer-accounts/view?id=${pidUser}`);
  }

  return (
    <div className="space-y-4">
      {/* Table Header / Stats */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {customerAccounts.length} Dedicated Accounts
        </h2>
      </div>

      {/* Main Table Container */}
      <div className="w-full overflow-x-auto rounded-lg border border-border bg-card shadow-soft">
        
        {loading ? (
          <div className="flex items-center justify-center p-12 text-sm font-medium text-muted-foreground animate-pulse">
            Loading accounts...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-12 text-sm font-medium text-destructive">
            {error}
          </div>
        ) : (
          <table className="w-full text-left text-sm text-foreground">
            
            <thead className="border-b border-border bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-6 py-4">S/N</th>
                <th scope="col" className="px-6 py-4">ID & Full Name</th>
                <th scope="col" className="px-6 py-4">Contact Info</th>
                <th scope="col" className="px-6 py-4">Bank Details</th>
                <th scope="col" className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-border bg-card">
              {Array.isArray(customerAccounts) && customerAccounts.length > 0 ? (
                customerAccounts.map((user: any, index: number) => (
                  <tr 
                    key={user.id || index} 
                    className="transition-colors hover:bg-muted/30"
                  >
                    {/* S/N */}
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-muted-foreground">
                      {index + 1}
                    </td>

                    {/* ID & Full Name */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          ID: {user.customer?.id}
                        </span>
                        <span className="font-semibold text-foreground">
                          {user.customer?.first_name} {user.customer?.last_name}
                        </span>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-foreground">
                          {user.customer?.email}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {user.customer?.phone || 'No phone provided'}
                        </span>
                      </div>
                    </td>

                    {/* Bank Details */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          {user.bank?.name}
                        </span>
                        <span className="font-semibold text-foreground">
                          {user.account_name}
                        </span>
                        <span className="font-mono text-sm tracking-wide text-primary">
                          {user.account_number}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right">
                      {user.userStatus !== 'superadmin' && (
                        <button
                          onClick={() => handleViewDetails(user.customer?.email)}
                          className="inline-flex items-center justify-center rounded-md bg-background px-3 py-1.5 text-xs font-medium text-primary border border-border shadow-sm transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-card"
                        >
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                /* Properly structured empty state for a table */
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                    No customer accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}