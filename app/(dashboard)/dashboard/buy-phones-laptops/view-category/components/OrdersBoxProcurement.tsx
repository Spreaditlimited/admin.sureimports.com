'use client';
import React, { useEffect, useState } from 'react';
import AnimateHeight from 'react-animate-height';
import TableProcurementProducts from './TableProcurementProducts';
import Loader from '@/app/uix/Loader';
import { useParams, useSearchParams } from 'next/navigation';
import { BaggageClaim, CornerRightDown } from 'lucide-react';



interface Product {
    id: number;
    pidProduct: string;
    pidOrder: string;
    pidUser: string;
    productName: string;
    productLink: string;
    productCategory: string;
    productPrice: string;
    productWeight: string;
    productQuantity: string;
    productInfo: string;
    productStatus: string;
  }
  

interface Order {
    id: any;
    pidOrder: string;
    pidUser: string;
    orderName: string;
    destinationCountry: string;
    currencyType: string;
    shippingPlan: string;
    orderCategory: string;
    shippingAddress: string;
    status: string;
    createdAt: string;
    products: Product[]
  }



  interface User {
    id: any;
    pidUser: string;
    userFirstname: string;
    userLastname: string;
    userEmail: string;
    userPassword: string;
    userSession: string;
    cidStatus: string;
    loginStatus: string;
    loginKey: string;
    loginStamp: string;
    gender: string;
    dob: string;
    email: string;
    phone: string;
    address: string;
    country: string;
    bank_name: string;
    bank_account_number: string;
    bank_account_name: string;
    ref_id: string;
    userPhone: string;
    userCid: string;
    userShippingAddress: string;
    userShippingAddress2: string;
    userCountry: string;
    userState: string;
    userAffiliateCode: string;
    userAffiliateRef: string;
    userStatus: string;
    userImage: string;
  }

const ComponentsAccordionsBasic = () => {


    // VARIABLES
    const [active, setActive] = useState<string>('1');
    const [loading, setLoading] = useState<boolean>(true);
    const togglePara = (value: string) => {
        setActive((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };



    // VARIABLES 
    const status = useSearchParams().get('status') || 'none'; // Get the current 'status' value
    const [orderALL, setOrderALL] = useState<Order[]>([]);
    const [message, setMessage] = useState<String>('');


    //GET RECORDS FROM DATABASE
    async function fetchDataOrder() {
        try {
           // Pull Records from database
           //const res = await fetch(`/api/get-data/order-all?pidOrder=${pidOrder}&pidUser=${pidUser}`);
           const res = await fetch(`/api/get-data/order-many?status=${status}`);
           const data = await res.json();
           setOrderALL(data);
        } catch (error) {
           console.error('Error fetching data:', error);
           // Handle the error appropriately (e.g., display an error message)
        } finally {
           setLoading(false); // Set loading to false when done
        }
  }




    //FETCH ORDERS AND PRODUCTS
    useEffect(() => {
        setLoading(true);
        fetchDataOrder();
    },[status]); // Empty dependency array to run only once on mount



   //LOADER & EMPTY RECORD PROCESSING 
   if (loading) {return <Loader />;} //show loader
   if (orderALL.length === 0) {
    return (
      <div className="m-7 flex border-spacing-1 items-center justify-center p-7 font-bold">
        <div className="rounded border-2 border-dotted border-gray-500 p-4">
          <p className="text-center text-gray-500">No {status} orders available</p>
        </div>
      </div>
    ); 
  }




    return (

                <>
                <div className='text-xl p-3'>{status.toUpperCase() ?? 'No '} orders</div>
                    
                {
                    orderALL.map(
                        (datax: any, index: number) => {
                        return (
                        
                            <div key={index + 1} className="mb-5">
                            <div className="space-y-2 font-semibold">
                                <div className="rounded border border-[#d3d3d3] dark:border-[#1b2e4b]" key={index + 1}>
                                    <button type="button" className={`flex w-full items-center p-4 text-white-dark dark:bg-[#1b2e4b] ${active === `${index+1}` ? '!text-primary' : ''}`} onClick={() => togglePara(`${index+1}`)}>
                                        <b className='text-xl'>#{index + 1} : {datax.orderName}</b>&nbsp; | ORDER ID: {datax.pidOrder} 
                                        
                                        &nbsp; &nbsp;

                                        <div className={`ltr:ml-auto rtl:mr-auto ${active === `${index+1}` ? 'rotate-180' : ''}`}>
                                         <CornerRightDown />
                                        </div>   

                                        <br /><hr />
                                                                                                                    
                                    </button>
                                    <div>
                                        <AnimateHeight duration={300} height={active === `${index+1}` ? 'auto' : 0}>
                                            <div className="space-y-2 border-t border-[#d3d3d3] p-4 text-[13px] text-white-dark dark:border-[#1b2e4b]">
                                                <TableProcurementProducts pidOrder={datax.pidOrder} pidUser={datax.pidUser} orderName={datax.orderName} shippingAddress={datax.shippingAddress}  />
                                            </div>
                                        </AnimateHeight>
                                    </div>
                                </div> 
                                </div>
                                </div>
                   
                        )
                    })
                }

</>
    );    
};

export default ComponentsAccordionsBasic;
