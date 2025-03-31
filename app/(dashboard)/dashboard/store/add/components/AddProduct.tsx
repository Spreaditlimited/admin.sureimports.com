'use client'

import Products from '@/componentsx/dashboard/Products';
import { Metadata } from 'next';
import React, { useMemo, useRef } from 'react';
import { useState } from 'react';
import { MdAddShoppingCart, MdAddToPhotos, MdBook } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAlert } from '@/app/context/AlertContext';
import Image from 'next/image';
import ImageUploadBox from '@/componentsx/ImageUploadBox';
import ImageBox from '@/componentsx/ImageBox';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import axios from 'axios';
import { PlusCircle, Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import RichTextEditor from '@/components/RichTextEditor';
import ImageBox2 from '@/componentsx/ImageBox2';



export const metadata: Metadata = {
    title: 'Admin Dashboard',
    description: 'Admin'
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
      setFile(file);
    };


    //SET FORM DATA
    let productID = 'STORE' + new Date().getTime().toString();
    //const [pidUser, setPidUser] = useState(user?.pidUser as string);
    const [file, setFile] = useState<File | null>(null)
    //const [isLoading, setIsLoading] = useState(false);
    const [pidProduct, setPidProduct] = useState(productID);
    const [productName, setProductName] = useState(productID);
    const [productCategory, setProductCategory] = useState('');
    const [productBrand, setProductBrand] = useState('');
    const [productPrice, setProductPrice] = useState('');
    const [productMOQ, setProductMOQ] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productFeatures, setProductFeatures] = useState('');
    const [productSpecification, setProductSpecification] = useState('');

    
    //TINY MCE EDITOR
    //const [content, setContent] = useState('');
    const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'moywdpb8ambo3p01qo59oz27mjwfpcukr7myzoopyicobb6i';
  
    const handleEditorChange = (newContent: string) => {
      //setContent(newContent);
      setProductDescription(newContent);
    };
  
    const handleSave = () => {
      //console.log('Content to save:', content);
      // Add your save logic here
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
                
                e.preventDefault();
                setIsLoading(true);
                if (!file) {toast.error('No Product Image selected'); setIsLoading(false); return;}else{}
                toast.info('Adding product to store . . .');
                //collecting form data
                const formData = new FormData();
                formData.append('file', file);
                formData.append('pidProduct', pidProduct);
                formData.append('productName', productName);
                formData.append('productCategory', productCategory);
                formData.append('productBrand', productBrand);
                formData.append('productPrice', productPrice);
                formData.append('productMOQ', productMOQ);
                formData.append('productDescription', productDescription);
                formData.append('productFeatures', productFeatures);
                formData.append('productSpecification', productSpecification);

                //formData.append('categoryImage', categoryImage);

                //MAKE REQUEST ATTEMPT
                try {
                    //MAKE REQUEST
                            const res = await fetch('/api/crud/store/create', {
                            method: 'POST',
                            //headers: { 'Content-Type': 'application/json' },
                            //headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            //headers: { 'Content-Type': 'multipart/form-data' },
                            body: formData,
                    });

                    //PROCESS POST RESPONSE
                    const data: any = await res.json();
                    //if (data.status == 'SUCCESS'){toast.success(data.responsex.message);}
                    if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard/store/view', 'success', 'Product was successfully created!');}
                    if (data.statusx == 'NO_IMAGE_SELECTED'){toast.warning(data.message);}
                    if (data.statusx == 'INVALID_IMAGE_UPLOAD'){toast.warning(data.message);}
                    if (data.statusx == 'IMAGE_UPLOAD_FAILED'){toast.warning(data.message);}
                    if (data.statusx == 'ACTION_FAILED'){toast.error(data.message);}

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
            name='productName'
            onChange={(e) => setProductName(e.target.value)}
            type="text"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        


        {/* Double Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Category *</label>
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            id='productCategory' 
            name='productCategory'
            value={productCategory} 
            onChange={(e:any) => setProductCategory(e.target.value)}
            required
          >
            <option value="">Select a Cateogry</option>
            <option value="laptop">Laptop</option>
            <option value="laptop">Desktop</option>
            <option value="phone">Phones</option>
            <option value="other">Others</option>
          </select>
          </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand *</label>
          <select
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            id='productBrand' 
            name='productBrand'
            value={productBrand} 
            onChange={(e:any) => setProductBrand(e.target.value)}
            required
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




        {/* Double Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300"> Price *</label>
          <input
            id="productPrice" 
            name='productPrice' 
            type="number" 
            placeholder="0.00" 
            onChange={(e) => setProductPrice(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          </div>

          <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">MOQ *</label>
          <input
            id="productMOQ" 
            name='productMOQ' 
            type="number" 
            placeholder="Provide Minimum Order Quantity" 
            //defaultValue={1}
            onChange={(e) => setProductMOQ(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          </div>
        </div>




        {/* Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Description *</label>


          {/* <RichTextEditor 
            apiKey={apiKey}
            initialValue="<p>Start editing here...</p>" 
            onChange={handleEditorChange} 
            //onChange={handleEditorChange} 
          /> */}

          <textarea
            id="productDescription"  
            name='productDescription' 
            placeholder="Provide product description here"
            onChange={(e) => setProductDescription(e.target.value)}
            rows={4}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
        </div>


        {/* Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Features</label>
          {/* <TiptapEditor content={content} onChange={setContent} /> */}
          <textarea
            id="productFeatures"  
            name='productFeatures' 
            placeholder="Provide product features here"
            onChange={(e) => setProductFeatures(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
        </div>





        {/* Textarea */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pay Small Small</label>
          <textarea
            id="productSpecification"  
            name='productSpecification' 
            placeholder="Provide product specification here"
            onChange={(e) => setProductSpecification(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          ></textarea>
        </div>


        {/* File Upload */}
        {/* <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Upload Resume</label>
          <input
            id='file'
            name='file'
            type="file"
            className="mt-1 block w-full text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-gray-700 dark:file:text-gray-300"
          />
        </div> */}

        {/* IMAGE UPLOAD */}
        <div className="mb-6">
            <div>
                <label htmlFor="url"><b>Upload Product Image</b></label>
                <div className="flex">
                        {/* <ImageBox onImageChange={handleImageChange} /> */}
                        <ImageBox2 onImageChange={handleImageChange} imagex={''} />
                </div>
            </div>
        </div>


        <div className="mb-6">
        <label className="flex items-center">
            <input
              type="checkbox"
              className="sr-onlyXYZ peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Turn <b>ON / OFF</b> Product Visibility</span>
          </label>
        </div>


        {/* Toggle Switch */}
        {/* <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">Turn <b>ON / OFF</b> Product Visibility</span>
          </label>
        </div> */}


        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn bg-slate-600 !mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 "
          >
            <PlusCircle /> &nbsp; Add Product
          </button>
        </div>


      </div>
    </div>
</form>
      
        </>
    );
};

export default Page;