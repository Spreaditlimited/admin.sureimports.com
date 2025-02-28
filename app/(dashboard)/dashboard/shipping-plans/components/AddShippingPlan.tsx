'use client'
import {countryArray} from '@/lib/countries';
import Products from '@/componentsx/dashboard/Products';
import { Metadata } from 'next';
import React, { useRef } from 'react';
import { useState } from 'react';
import { MdAddShoppingCart, MdAddToPhotos, MdBook } from 'react-icons/md';
//import ReactQuill from 'react-quill';
//import 'react-quill/dist/quill.snow.css';
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
//import Editor from '@/componentsx/Editor/Editor';
//import Table3 from '../../../../../_X/_TableLayout3';
import { PrismaClient } from '@prisma/client';
import { random } from 'lodash';
// import ReactQuill from 'react-quill';
// import 'react-quill/dist/quill.snow.css';
import { CountryDataFetcher } from "../components/CountryDataFetcher"
import { CountryTable } from "../components/CountryTable"
import { Save } from 'lucide-react';


export const metadata: Metadata = {
    title: 'SureImports Admin Dashboard',
    description: 'SureImports, Import from China to any part of the world.'
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

  const shippingPlanArray = [
  { label: 'Normal Shipping', value: 'NORMAL_SHIPPING' },
  { label: 'Express Shipping', value: 'EXPRESS_SHIPPING' },
  { label: 'Special Shipping', value: 'SPECIAL_SHIPPING' },
  { label: 'Sea Shipping', value: 'SEA_SHIPPING' },
] as const;

// Define the type for table data
// type TableData = {
//     id: number;
//     countryName: string;
//   };


// Sample data for the table
// const initialData: TableData[] = [
//     { id: 1, name: "EmJohn Doe", email: "john.doe@example.com", role: "Developer", status: "Active" },
//     { id: 2, name: "Jane Smith", email: "jane.smith@example.com", role: "Designer", status: "Inactive" },
//     { id: 3, name: "Alice Johnson", email: "alice.johnson@example.com", role: "Manager", status: "Active" },
//     { id: 4, name: "Bob Brown", email: "bob.brown@example.com", role: "Developer", status: "Active" },
//     { id: 5, name: "Charlie Davis", email: "charlie.davis@example.com", role: "Tester", status: "Inactive" },
//     { id: 6, name: "David Wilson", email: "david.wilson@example.com", role: "Developer", status: "Active" },
//     { id: 7, name: "Eva Green", email: "eva.green@example.com", role: "Designer", status: "Inactive" },
//     { id: 8, name: "Frank White", email: "frank.white@example.com", role: "Manager", status: "Active" },
//     { id: 9, name: "Grace Black", email: "grace.black@example.com", role: "Developer", status: "Active" },
//     { id: 10, name: "Henry Brown", email: "henry.brown@example.com", role: "Tester", status: "Inactive" },
//     ];

 // Fetch data from the database
// export async function getServerSideProps() {
//   const prisma = new PrismaClient();
//   const countries = await prisma.country.findMany();
//   await prisma.$disconnect();

//   return {
//     props: {
//       initialData: countries,
//     },
//   };
// }   



// // Fetch data from the database
// export async function getServerSideProps() {
//     const prisma = new PrismaClient();
//     try {
//       const users = await prisma.country.findMany();
//       await prisma.$disconnect();
//       return {
//         props: {
//           initialData: users,
//         },
//       };
//     } catch (error) {
//       console.error('Error fetching data:', error);
//       await prisma.$disconnect();
//       return {
//         props: {
//           initialData: [], // Return empty array if fetching fails
//         },
//       };
//     }
//   }
type ShippingPlan = {
    id: number
    pidShippingPlan: string
    shippingPlanName: string | null
    shippingPlanRate: number | null
  }
  
  type Country = {
    id: number
    pidCountry: string
    countryName: string | null
    shippingPlans: ShippingPlan[]
  }     


  type TableData = {
    id: number
    //pidCountry: string
    countryName: string | null
    //shippingPlans: ShippingPlan[]
  }    


 

const Page = ({ initialData }: { initialData: TableData[] }) => {

    console.log("+++++++++++++++++++++++++++++++++++++++"+initialData);
    //alert(initialData);
    const [value, setValue] = useState('');

    //initialize alert system
    const navigateWithAlert = useNavigationWithAlert();

    //SET VARIABLES DATA
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);


    //SET FORM DATA
    let shippingPlanID = 'SHP' + new Date().getTime().toString();
    const [pidShippingPlan, setPidPost] = useState(shippingPlanID);

    let countryID = 'CTY' + new Date().getTime().toString();
    const [pidCountry, setPidCountry] = useState(countryID);

    const [country, setCountry] = useState('');
    const [shippingPlan, setShippingPlan] = useState('');
    const [shippingRate, setShippingRate] = useState('');



    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                setIsLoading(true);

                //collecting form data
                const formData = new FormData();
                formData.append('pidShippingPlan', pidShippingPlan);
                formData.append('pidCountry', pidCountry);
                formData.append('country', country);
                formData.append('shippingPlan', shippingPlan);
                formData.append('shippingRate', shippingRate);


                //MAKE REQUEST ATTEMPT
                try {
                    //MAKE REQUEST
                            const res = await fetch('/api/crud/posts/create/shipping-plan', {
                            method: 'POST',
                            //headers: { 'Content-Type': 'application/json' },
                            //headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            //headers: { 'Content-Type': 'multipart/form-data' },
                            body: formData,
                    });


                    //PROCESS POST RESPONSE
                    const data: ApiResponse = await res.json();
                    if (data.responsex.status == 'SUCCESS'){toast.success(data.responsex.message);}
                    if (data.responsex.status == 'SUCCESS'){navigateWithAlert('/dashboard/shipping-plans/add', 'success', 'Action was successfully!');}
                    if (data.responsex.status == 'ALREADY_EXIST'){toast.warning(data.responsex.message);}
                    if (data.responsex.status == 'FAILED'){toast.warning(data.responsex.message);}
                    if (data.responsex.status == 'ACTION_FAILED'){toast.error(data.responsex.message);}


            } catch (error: any) {
                toast.error(error.message);
                //navigateWithAlert('/dashboard', 'success', 'Action was successfully!')
            } finally {
                setIsLoading(false);
            }
    }
//END FORM...



    return (
            <main>





<div className="space-y-8 pt-1">
        <div className="pt-3 pl-20 panel flex items-center overflow-x-auto whitespace-nowrap p-10 text-dark">



{/* -------------------------- SHIPPING FORM -------------------------- */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Column 1 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
              Shipping Country
            </label>
            <select 
                    //key={random(999)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    id='country' 
                    name='country'
                    value={country} 
                    onChange={(e:any) => setCountry(e.target.value)}
                    required>
                        <option key={0}> - Select - </option>
                            {
                                countryArray.map(
                                    (datax: any, index) => 
                                      {
                                        return(<><option key={index} value={datax.value}>{datax.label}</option></>)
                                      }
                                )
                            }
                </select>
          </div>

        </div>

        {/* Column 2 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
              Shipping Rate
            </label>
            <input 
                  id="shippingRate" 
                  name='shippingRate' 
                  type="number" 
                  placeholder="Enter Shipping Rate" 
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onChange={(e) => setShippingRate(e.target.value)}
                  required 
                />
          </div>
          <div>

          </div>
        </div>

        {/* Column 3 */}
        <div className="space-y-4">

          <div>
            <div>
            <label htmlFor="ShippingPlan" className="block text-sm font-medium text-gray-700">
              Shipping Plan
            </label>
            <select 
                    //key={random(999)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    id='shippingPlan' 
                    name='shippingPlan'
                    value={shippingPlan} 
                    onChange={(e:any) => setShippingPlan(e.target.value)}
                    required>
                        <option> - Select - </option>
                            {
                                shippingPlanArray.map(
                                    (datax: any, index) => {
                                        return(<><option  key={index} value={datax.value}>{datax.label}</option></>)
                                    }
                                )
                            }

                </select>
          </div>
          </div>
        </div>

        {/* Column 4 */}
        <div className="space-y-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">
             
            </label>

          </div>
        {/* Submit Button */}
        <div className="">
          <button
            type="submit"
            className="btn !mt-6x inline-flex justify-center py-3 px-4 border border-transparent shadow-sm  w-full bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <Save /> &nbsp; Add Shipping Plan
          </button>

          {/* <button
            type="submit"
            className="btn bg-slate-600 !mt-6 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 "
          >
            <Save /> &nbsp; Add Shipping
          </button> */}
        </div>
        </div>
        

      </form>




</div>
</div>


{/* <Table3 initialData={initialData} /> */}

</main>
    );
};

export default Page;