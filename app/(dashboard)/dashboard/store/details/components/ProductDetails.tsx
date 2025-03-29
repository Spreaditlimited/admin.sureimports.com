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
import { PlusCircle, Save } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { db } from "@/lib/db"

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
  
  export const ProductDetailsDisplay: React.FC<ProductDetailsDisplayProps> = ({ product }) => {

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



    return (
        <>

<div className="max-w-4xl mx-auto bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Details</h2>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Edit</button>
          <button className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            Back
          </button>
        </div>
      </div>

      {/* Basic Info Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product ID</h3>
              <p className="text-base text-gray-900 dark:text-white">{product.pidProduct}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Name</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.productName}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</h3>
              <p className="text-base text-gray-900 dark:text-white">{product.productCategory}</p>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</h3>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">${product.productPrice.toFixed(2)}</p>
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
              {product.productFeatures}
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

