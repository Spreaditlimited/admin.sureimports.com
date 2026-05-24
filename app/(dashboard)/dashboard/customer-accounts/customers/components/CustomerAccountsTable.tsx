'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MdAddToPhotos } from 'react-icons/md';
import { prisma } from '@/lib/prisma';
import { toast } from 'sonner';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

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
 <h1 className="text-base font-bold m-2">{customerAccounts.length} Customer's Accounts</h1>
    {/* <div>
        <button type="button" onClick={() => { router.push('/dashboard/admin/add');}} className="btn btn-primary w-full"><MdAddToPhotos /> &nbsp; Add New Admin</button>
    </div> */}

    {/* <h1 className="text-base font-bold m-2 p-3">View Admin Users Records</h1> */}
      {/* Search Input */}
      {/* <input
        type="text"
        value={search}
        onChange={handleSearchChange}
        placeholder="Search by name..."
        className="border border-gray-300 p-3 m-3 mb-4 w-fullx rounded-md dark:text-white-700 dark:bg-gray-700"
      /> */}

      {/* Table */}
      {loading ? (
        <div className='flex justify-center m-10 text-gray-600'> L o a d i n g . . . </div>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">S/N</th>
            <th scope="col" className="px-6 py-3">ID / Full Name </th>
            <th scope="col" className="px-6 py-3">Email / Phone</th>
            <th scope="col" className="px-6 py-3">Account Details</th>
            <th scope="col" className="px-6 py-3">Action</th>
          </tr>
        </thead>
        <tbody>

        {Array.isArray(customerAccounts) && customerAccounts.length > 0 ? (
              customerAccounts.map((user:any, index:number) => (
          <tr key={index + 1} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
            {index + 1}
            </td>
            {/* <td className="px-6 py-4">
                    <div className="w-20 h-20 bg-gray-100 relative">
                        <Image
                            src={process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL+'/'+`${cat.categoryImage}` as string}
                            alt="Category"
                            width={100} // specify width
                            height={100} // specify height
                            className="absolute w-full h-full object-contain border-solid border-4 border-gray-300 rounded-xl"
                        />
                    </div>
            </td> */}
            
            <td className="px-6 py-4">
                <small> ID: <b>{user.customer.id}</b></small><br />
                Name: <b>{user.customer.first_name}</b> &nbsp; <b>{user.customer.last_name}</b><br />

            </td>

            <td className="px-6 py-4">
                Email: <b>{user.customer.email}</b><br />
                Phone: <b>{user.customer.phone}</b><br />
            </td>

            <td className="px-6 py-4">
                Bank: <b>{user.bank.name}</b><br />
                Account Name: <b>{user.account_name}</b><br />
                Account Number: <b>{user.account_number}</b><br />
            </td>
            
            <td className="px-6 py-4">
                {/* <a href="#" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">View</a> | &nbsp;
                <a href="#" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</a> | &nbsp; */}
                { user.userStatus != 'superadmin' &&
                <a href="#" onClick={() => handleViewDetials(user.customer.email as any)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">View Details</a>
                }
            </td>
            
          </tr>
                        ))
                      ) : (
                        <div className="flex border p-5 text-center justify-center m-10 colSpan=">
                          {/* <td className="border p-2 text-center" colSpan={3}> */}
                            No categories found.
                          {/* </td> */}
                        </div>
                      )}
        </tbody>
      </table>
      )}
    </div>
    


    </>
  );
}
