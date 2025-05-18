'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MdAddToPhotos } from 'react-icons/md';
import { prisma } from '@/lib/prisma';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import Loading from '@/components/layouts/loading';
import TransactionsTable from './TransactionsTable';

// interface User {
//   id: number;
//   name: string;
//   email: string;
// }

// interface AdminProps {
//       id: number;
//       pidUser: string; 
//       userFirstname: number; 
//       userLastname: string;
//       userEmail: string; 
//       userPhone: string; 
//       userStatus: string; 
//       userExt1: string;
//       createdAt: string;
//   }

export default function ProductsTable() {
  
      const navigateWithAlert = useNavigationWithAlert();
      const [statusz, setStatus2] = useState<any>('ok');
      //const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
      //const [customerAccounts, setCustomerAccounts] = useState<any | null>(null);
      const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
      const [search, setSearch] = useState<string>('');
      const [loading, setLoading] = useState<boolean>(true);
      const [error, setError] = useState<string | null>(null);
      const [page, setPage] = useState<number>(1);
      const [totalAmount, setTotalAmount] = useState<number>(0);

      const [customer, setCustomer] = useState<any | null>(null);
      const [transactions, setTransaction] = useState<any | null>(null);
    
      const [statusx, setStatus] = useState<string | null>(null);
      const [message, setMessage] = useState<string | null>(null);



  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/paystack/dedicated-accounts?status=ok`);

        // if (!response.ok) {
        //   throw new Error('Failed to fetch customer data');
        // }

        const data:any = await response.json();

        //alert(data.statusx+' '+data.message);
        setStatus(data.statusx);
        setMessage(data.message);
        setCustomerAccounts(data.accountDetails.data);
        setTransaction(data.transactionDetails);
        setTotalAmount(data.totalAmount);
      } catch (statusx) {
        //setError(error instanceof Error ? error.message : 'Unknown error');
        //setStatus(statusx as string);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [statusz]);





  const router = useRouter();


  async function handleViewDetials(pidUser:any){
      toast.info('Opening customer details...');return;
      try {
            //const response = await fetch(`/api/users?search=${search}&page=${page}&limit=5`);
            const response = await fetch(`/api/crud/admin/delete?pidUser=${pidUser}`);
            const data:any = await response.json();

            if(data.statusx == 'SUCCESS'){
              if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard', 'success', data.message);}
              //toast.success(data.message);
              }

            if(data.statusx == 'FAILED'){
              toast.error(data.message);
              }

      } catch (error) {
          toast.error(error as any);
          setError('Failed to fetch users');
      } finally {
          setLoading(false);
      }
  }




  return (

    <>

    <div className="w-full overflow-x-auto shadow-md sm:rounded-lg">
 




      {/* Table */}
      {loading ? (
        <div className='flex justify-center m-10 text-gray-600'> L o a d i n g . . . </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
<>
<h1 className="text-base font-bold m-2">{transactions.transactions.length} Customer Transactions </h1>

        <div className="rounded-lg bg-gray-200 p-1 shadow dark:bg-gray-500">
          <Suspense fallback={<Loading />}>
            {transactions.transactions.length > 0 && (
              <TransactionsTable
                transactions={transactions.transactions}
              />
            )}
            {transactions.transactions.length == 0 && (
              <div className="flex items-center justify-center p-4">
                <p className="text-sm text-gray-600 dark:text-gray-800">
                  No transactions available
                </p>
              </div>
            )}
          </Suspense>
        </div>

        </>
      )}
    </div>
    


    </>
  );
}


