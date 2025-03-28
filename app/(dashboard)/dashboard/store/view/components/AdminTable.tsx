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

interface AdminProps {
      id: number;
      pidUser: string; 
      userFirstname: number; 
      userLastname: string;
      userEmail: string; 
      userPhone: string; 
      userStatus: string; 
      userExt1: string;
      createdAt: string;
  }

export default function ProductsTable() {
      const navigateWithAlert = useNavigationWithAlert();
      
  const [adminUsers, setAdminUsers] = useState<AdminProps[]>([]);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const getCategories = async (search: string, page: number) => {
            setLoading(true);
            setError(null);

            try {
                //const response = await fetch(`/api/users?search=${search}&page=${page}&limit=5`);
                const response = await fetch(`/api/get-data/admin`);
                const responseData:any = await response.json();
                setAdminUsers(responseData);
                setTotalPages(responseData.totalPages);
            } catch (error) {
                setError('Failed to fetch users');
            } finally {
                setLoading(false);
            }
        };

  useEffect(() => {
    getCategories(search, page);
  }, [search, page]);


  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const router = useRouter();


  async function handleDelete(pidUser:any){
      toast.info('Deleting User...');
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
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3">S/N</th>
            <th scope="col" className="px-6 py-3">Full Name/ ID</th>
            <th scope="col" className="px-6 py-3">Level/Email/Phone</th>
            <th scope="col" className="px-6 py-3">Action</th>
          </tr>
        </thead>
        <tbody>

        {(adminUsers || []).length ? (
              adminUsers.map((user:AdminProps, index:number) => (
          <tr key={index + 1} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
            {index + 1}
            </td>
            {/* <td className="px-6 py-4">
                    <div className="w-20 h-20 bg-gray-100 relative">
                        <Image
                            src={process.env.NEXT_PUBLIC_R2_PUBLIC_URL+'/'+`${cat.categoryImage}` as string}
                            alt="Category"
                            width={100} // specify width
                            height={100} // specify height
                            className="absolute w-full h-full object-contain border-solid border-4 border-gray-300 rounded-xl"
                        />
                    </div>
            </td> */}
            <td className="px-6 py-4">
                Account: {user.userExt1}<br />
                Admin User: {user.userFirstname} &nbsp; {user.userLastname}<br />
               <small> ID: {user.pidUser}</small><br />
            </td>
            <td className="px-6 py-4">
                Access Level: {user.userStatus} <br />
                Email: {user.userEmail} <br />
                Phone: {user.userPhone} <br />
               Account Created: {user.createdAt} <br />
            </td>
            
            <td className="px-6 py-4">
              {/* <a href="#" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">View</a> | &nbsp;
              <a href="#" className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Edit</a> | &nbsp; */}
              { user.userStatus != 'superadmin' &&
              <a href="#" onClick={() => handleDelete(user.pidUser as any)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Delete</a>
              }
              </td>
            
          </tr>
                        ))
                      ) : (
                        <tr className="flex border p-5 m-5 text-center justify-center">
                          {/* <td className="border p-2 text-center" colSpan={3}> */}
                            No categories found.
                          {/* </td> */}
                        </tr>
                      )}
        </tbody>
      </table>
      )}
    </div>
    


    <div className="max-w-4xlx mx-autox w-full p-4">

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-gray-300 dark:text-white-700 dark:bg-gray-700"
        >
          Previous
        </button>

        <p>
          Page {page} of {totalPages}
        </p>

        <button
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-gray-300 dark:text-white-700 dark:bg-gray-700"
        >
          Next
        </button>
      </div>
    </div>
    </>
  );
}


