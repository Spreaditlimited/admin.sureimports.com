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



const Page = () => {
    const {user} = useAuth();
    //initialize alert system
    const navigateWithAlert = useNavigationWithAlert();

    //SET VARIABLES DATA
    const router = useRouter();
    //const [value, setValue] = useState('<h3>Product Description Title</h3><br /><p> Product description goes here...</p>');
    //const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false);


    const handleImageChange = (file: File) => {
      //setFile(file);
    };


    //SET FORM DATA
    let AdminUserID = 'ADM' + new Date().getTime().toString();
    //const [pidUser, setPidUser] = useState(user?.pidUser as string);
    const [pidAdminUser, setAdminUser] = useState(AdminUserID);
    const [accountName, setAccountName] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [authorizationLevel, setAuthorizationLevel] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
                toast.info('Adding Admin User . . .');
                e.preventDefault();
                setIsLoading(true);

                //if (!file) {toast.error('No Product Image selected'); setIsLoading(false); return;}else{}

                //collecting form data
                const formData = new FormData();
                //formData.append('file', file);
                //formData.append('pidUser', pidUser);
                formData.append('pidAdminUser', pidAdminUser);
                formData.append('accountName', accountName);
                formData.append('firstName', firstName);
                formData.append('lastName', lastName);
                formData.append('email', email);
                formData.append('phone', phone);
                formData.append('password', password);
                formData.append('authorizationLevel', authorizationLevel);

                //formData.append('categoryImage', categoryImage);

                //MAKE REQUEST ATTEMPT
                try {
                    //MAKE REQUEST
                            const res = await fetch('/api/crud/admin/create', {
                            method: 'POST',
                            //headers: { 'Content-Type': 'application/json' },
                            //headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            //headers: { 'Content-Type': 'multipart/form-data' },
                            body: formData,
                    });


                    //PROCESS POST RESPONSE
                    const data: any = await res.json();
                    //if (data.responsex.status == 'SUCCESS'){toast.success(data.responsex.message);}
                    if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard/admin/view', 'success', 'Admin User was successfully created!');}
                    if (data.statusx == 'USER_EXISTS'){toast.error(data.message);}
                    if (data.statusx == 'FAILED'){toast.error(data.responsex.message);}

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
        <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Product Form</h2>


        {/* Single Column */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name *</label>
          <input
            name='accountName'
            onChange={(e) => setAccountName(e.target.value)}
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        


        {/* Double Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Category</label>
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select a Cateogry</option>
            <option value="laptop">Laptop</option>
            <option value="laptop">Desktop</option>
            <option value="phone">Phones</option>
            <option value="other">Others</option>
          </select>
          </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand Category</label>
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Product Brand</option>
            <option value="hp">HP</option>
            <option value="dell">DELL</option>
            <option value="acer">ACER</option>
            <option value="lenovo">LENOVO</option>
            <option value="apple">APPLE</option>
            <option value="phone">GOOGLE</option>
          </select>
          </div>
        </div>


        {/* Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
          <textarea
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your message..."
          ></textarea>
        </div>


        {/* Textarea */}
        div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
          <textarea
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your message..."
          ></textarea>
        </div>


        {/* Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
          <textarea
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your message..."
          ></textarea>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Resume</label>
          <input
            type="file"
            className="mt-1 block w-full text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-gray-700 dark:file:text-gray-300"
          />
        </div>

        {/* Toggle Switch */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Turn <b>ON / OFF</b> Product Visibility</span>
          </label>
        </div>




        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn bg-slate-600 !mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 "
          >
            <Save /> &nbsp; Create Admin
          </button>
        </div>


      </div>
    </div>
</form>
      
        </>
    );
};

export default Page;