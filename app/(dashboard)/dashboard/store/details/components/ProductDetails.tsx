'use client'

import Products from '@/componentsx/dashboard/Products';
import { Metadata } from 'next';
import React from 'react';
import { useState } from 'react';
import { MdAddShoppingCart, MdAddToPhotos, MdBook } from 'react-icons/md';
import { useRouter, useSearchParams } from 'next/navigation';
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
    const status = useSearchParams().get('status') || 'none'; // Get the current 'status' value
    const [orderALL, setOrderALL] = useState<Product[]>([]);

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
                    if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard/store/view', 'success', 'Admin User was successfully created!');}
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


  // Sample product data - in a real application, this would come from props or an API
  const product = {
    id: "PROD-001",
    name: "Premium Ergonomic Office Chair",
    description:
      "A high-quality ergonomic office chair designed for maximum comfort during long work hours. Features adjustable height, lumbar support, and breathable mesh material.",
    price: 299.99,
    stock: 45,
    category: "Office Furniture",
    features: [
      "Adjustable height with pneumatic lever",
      "Ergonomic design with lumbar support",
      "Breathable mesh back material",
      "360-degree swivel capability",
      "Durable nylon casters for smooth movement",
    ],
    specifications: [
      { note: "Dimensions" },
      // { name: "Weight Capacity", value: "300 lbs" },
      // { name: "Material", value: "Mesh, Nylon, Polyurethane" },
      // { name: "Assembly Required", value: "Yes" },
      // { name: "Warranty", value: "3 Years Limited" },
    ],
    lastUpdated: "2023-11-15T10:30:00Z",
  }

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
              <p className="text-base text-gray-900 dark:text-white">{product.id}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Name</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{product.name}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Category</h3>
              <p className="text-base text-gray-900 dark:text-white">{product.category}</p>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price</h3>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">${product.price.toFixed(2)}</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock</h3>
              <p className="text-base text-gray-900 dark:text-white">{product.stock} units</p>
            </div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(product.lastUpdated)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Description Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Description</h3>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
          <p className="text-gray-700 dark:text-gray-300">{product.description}</p>
        </div>
      </div>

      {/* Product Features Section */}
      <div className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Product Features</h3>
        <ul className="list-disc pl-5 space-y-2">
          {product.features.map((feature, index) => (
            <li key={index} className="text-gray-700 dark:text-gray-300">
              {feature}
            </li>
          ))}
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
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                >
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {product.specifications.map((spec, index) => (
                <tr
                  key={index}
                  className={index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-700"}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {spec.note}
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{spec.value}</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
      
        </>
    );
};

export default Page;