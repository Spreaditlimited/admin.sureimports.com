'use client'

import Products from '@/componentsx/dashboard/Products';
import { Metadata } from 'next';
import React from 'react';
import { useState } from 'react';
import { MdAddShoppingCart, MdAddToPhotos, MdBook } from 'react-icons/md';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
//import toast from 'react-hot-toast';
import { useAlert } from '@/app/context/AlertContext';
import Image from 'next/image';
import ImageUploadBox from '@/componentsx/ImageUploadBox';
import ImageBox from '@/componentsx/ImageBox';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowBigLeft, PlusCircle, Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from "@/lib/db"
import { FaBackward } from 'react-icons/fa';

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
  

  type Product = {
    pidProduct: string
    productName: string
    productPrice: string
    productSlug: string
    productCategory: string
    productBrand: string
    productMOQ: string
    productDescription: string
    productFeature: string
    productSpecification: string
    productVisibility: string
    productImage: string
    productImageType: string
    productImageExt: string
    createdAt: Date
    updatedAt: Date
  }
  
  interface ProductDetailsDisplayProps {
    product: Product
  }
  
  export const ProductDetailsDisplay:  React.FC<ProductDetailsDisplayProps> = ({ product }) => {

    const {user} = useAuth();
    //initialize alert system
    const navigateWithAlert = useNavigationWithAlert();

    //SET VARIABLES DATA
    const router = useRouter();
    //const [value, setValue] = useState('<h3>Product Description Title</h3><br /><p> Product description goes here...</p>');
    //const [file, setFile] = useState<File | null>(null)
    const [isLoading, setIsLoading] = useState(false);
    const status = useSearchParams().get('status') || 'none'; // Get the current 'status' value
    //const [product, setProductAll] = useState<any[]>([]);


  // Format date for display
  const formatDate = (dateString:any) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/'); // Fallback to home if no history
    }
  };


    return (
        <>
        
    {/* Product Details */}
    <div className="max-w-4xlx mx-auto bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product</h2>
        <div className="flex space-x-2">
          <button 
              type="button"
              onClick={()=>{router.push('/dashboard/store/edit?id='+product.pidProduct)}}
              className="btn bg-slate-600 !mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 "
              >
              <PlusCircle /> &nbsp; Edit
          </button>
          <button 
          onClick={handleBack}
          className="btn bg-slate-600 !mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ">
           <ArrowBigLeft /> &nbsp; Back
          </button>
        </div>
      </div>

      {/* Basic Info Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">


          <div className="md:col-span-2">

          <div className="w-96 h-96 bg-gray-100 relative rounded-xl">
                  <Image
                      src={process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL+'/'+`${product.productImage}` as string}
                      alt="Product"
                      width={300} // specify width
                      height={300} // specify height
                      className="absolute w-full h-full object-contain border-solid border-4 border-gray-300 rounded-xl"
                  />
          </div>

          <div className="mb-4 pt-7">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Name</h3>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.productName}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product ID</h3>
                <p className="text-base text-gray-900 dark:text-white">{product.pidProduct}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Brand / Category</h3>
                <p className="text-base text-gray-900 dark:text-white">{product.productBrand}, {product.productCategory}</p>
              </div>
          </div>


          <div className="text-lg">
            
            <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</h3>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    ₦
                    {
                        (
                          parseFloat(product.productPrice)
                        )
                        .toFixed(2)
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                    }
                </p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock</h3>
              <p className="text-base text-gray-900 dark:text-white">{1} units</p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(product.updatedAt)}</p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(product.createdAt)}</p>
            </div>

          </div>


        </div>
      </div>

      {/* Product Description Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Description</h3>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
          <p className="text-gray-700 dark:text-gray-300">{product.productDescription}</p>
        </div>
      </div>

      {/* Product Features Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Features</h3>
        <ul className="list-disc pl-5 space-y-2">

            <li className="text-gray-700 dark:text-gray-300">
              {product.productFeature}
            </li>

        </ul>
      </div>

      {/* Product Specifications Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Specifications</h3>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Specification
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">

                <tr
                  className={"bg-white dark:bg-gray-800"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {product.productSpecification}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{spec.value}</td> */}
                </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
      
        </>
    );
};

export default ProductDetailsDisplay;
