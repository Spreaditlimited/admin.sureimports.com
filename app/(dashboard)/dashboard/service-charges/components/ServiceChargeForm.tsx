'use client'

import Products from '@/componentsx/dashboard/Products';
import { Metadata } from 'next';
import React from 'react';
import { useState } from 'react';
import { MdAddShoppingCart, MdAddToPhotos, MdBook } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
//import toast from 'react-hot-toast';
import { useAlert } from '@/app/context/AlertContext';
import Image from 'next/image';
import ImageUploadBox from '@/componentsx/ImageUploadBox';
import ImageBox from '@/componentsx/ImageBox';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import axios from 'axios';
import { Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';


export const metadata: Metadata = {
    title: 'Printin Admin Dashboard',
    description: 'Printin'
};

//USER DATA
interface User {
    pidUser: string;
    email: string;
    name: string;
  }
  
//API RESPONSE
interface ApiResponse {
    responsex: any;
    successx: boolean;
    userx: User;
  }

interface ProductFormProps {
    product?: {
      id: number
      pidProduct: string
      pidCategory: string
      productName: string
      productDescription: number
      productCategory: string
      productPrice: number
      productPriceInfo: string
      productGeneralInfo: string
      productMOQ: number
      productVAT: number
      productAdditionalPrice: number
      productAdditionalDescription: string
    }
  }


  const Page: React.FC<any> = ({ rates }) => {
//const Page = (rates:any) => {
    const {user} = useAuth();
    //initialize alert system
    const navigateWithAlert = useNavigationWithAlert();
    //const box = JSON.stringify(rates['vat']);

    //SET VARIABLES DATA
    const router = useRouter();
    //const [value, setValue] = useState('<h3>Product Description Title</h3><br /><p> Product description goes here...</p>');
    //const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false);


    const handleImageChange = (file: File) => {
      //setFile(file);
    };


    //SET FORM DATA
    //let AdminUserID = 'ADM' + new Date().getTime().toString();
    //const [pidUser, setPidUser] = useState(user?.pidUser as string);
    const [serviceCharge, setServiceCharge] = useState<number>(rates.service_charge);
    const [vat, setVat] = useState<number>(rates.vat);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
                toast.info('Updating Service Charge & VAT . . .');
                e.preventDefault();
                setIsLoading(true);

                //if (!file) {toast.error('No Product Image selected'); setIsLoading(false); return;}else{}

                //collecting form data
                const formData = new FormData();
                //formData.append('file', file);
                formData.append('serviceCharge', serviceCharge as any);
                formData.append('vat', vat as any);



                //formData.append('categoryImage', categoryImage);

                //MAKE REQUEST ATTEMPT
                try {
                    //MAKE REQUEST
                            const res = await fetch('/api/crud/service-charges/update', {
                            method: 'PUT',
                            //headers: { 'Content-Type': 'application/json' },
                            //headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            //headers: { 'Content-Type': 'multipart/form-data' },
                            body: formData,
                    });

                    //PROCESS POST RESPONSE
                    const data: any = await res.json();
                    if (data.statusx == 'SUCCESS'){toast.success(data.message);}
                    //if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard/admin/view', 'success', data.message);}
                    if (data.statusx == 'FAILED'){toast.error(data.message);}

            } catch (error: any) {
                toast.error(error.message);
                //navigateWithAlert('/dashboard', 'success', 'Action was successfully!')
            } finally {
                setIsLoading(false);
            }
    }
//END FORM...






    return (
        <>

<form className="space-y-5" onSubmit={handleSubmit} >
    <div className="">
      <div className="max-w-4xlx mx-auto bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Update Charges & VAT </h2>


        {/* Single Column */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Charge</label>
          <input
            step="0.01"
            defaultValue={rates.service_charge}
            name='exNairaToDollar'
            onChange={(e) => setServiceCharge(Number(e.target.value))}
            type="number"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>


        {/* Single Column */}
         <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value Added Tax (VAT)</label>
          <input
            step="0.01"
            defaultValue={rates.vat}
            name='exNairaToDollar'
            onChange={(e) => setVat(Number(e.target.value))}
            type="number"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>




        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn bg-slate-600 !mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 "
          >
            <Save /> &nbsp; Update Service Charge
          </button>
        </div>


      </div>
    </div>
</form>
      
        </>
    );
};

export default Page;