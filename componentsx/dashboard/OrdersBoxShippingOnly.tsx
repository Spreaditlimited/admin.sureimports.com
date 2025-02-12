'use client';

import React, { useEffect, useState } from 'react';
import AnimateHeight from 'react-animate-height';
import TableProcurementProducts from './TableProcurementProducts';
import Loader from '@/app/uix/Loader';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { BookDown } from 'lucide-react';




interface Order {
    id: number;
    pidShippingOnly: string;
    pidUser: string;
    whatsappNumber: string;
    shippingName: string;
    shippingTo: string;
    grossWeight: string;
    trackingNumber: string;
    shippingPlan: string;
    wantProductVerification: string;
    wantConsolidation: string;
    multipleSuppliers: string;
    description: string;
    status: string;
    createdAt: string;
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
           const res = await fetch(`/api/get-data/shipping-only-many?status=${status}`);
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


    function setActionType(value:string) {
        alert(value);
    }




    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
    
        const formData = new FormData(event.currentTarget);
        // const buttonClicked = formData.get('action');
        // alert(buttonClicked);
        // if (buttonClicked === 'approve') {
        //   alert('APPROVED');
        // } else if (buttonClicked === 'decline') {
        //   alert('DECLINE');
        // } else {
        //   //setResult('Unknown action!');
        // }
    
        // if (actionType === 'save') {
        //   setMessage('Save button clicked! Performing save action...');
        //   // Perform save logic here
        // } else if (actionType === 'delete') {
        //   setMessage('Delete button clicked! Performing delete action...');
        //   // Perform delete logic here
        // } else {
        //   setMessage('Unknown action!');
        // }
    
    
    
              //formData.append('message', message);
              //formData.append('pidOrder', pidOrder);
              formData.append('status', status);
    
          //MAKE REQUEST ATTEMPT
          try {
            toast.info('Processing . . .');
            //MAKE REQUEST
            const res = await fetch('/api/stage-processing/shipping-only', {
              method: 'POST',
              body: formData,
            });
      
            // GET & PROCESS RESPONSE FROM API
            const data: ApiResponse = await res.json();
      
            if (data.responsex.status == 'SUCCESS'){navigateWithAlert('/dashboard', 'success', 'Payment details was successfully submited, awaiting payment status confirmation.');}
            // if (data.responsex.status == 'SUCCESS') {
            //   toast.success(data.responsex.message);
            // }
            if (data.responsex.status == 'ACTION_FAILED') {
              toast.warning(data.responsex.message);
            }
            if (data.responsex.status == 'EMPTY_BANK_PAYMENT_DETAILS') {
              toast.warning(data.responsex.message);
            }
          } catch (error: any) {
              console.log(error.message);
          } finally {
            //setLoading(false);
          }
    
    
      }




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
                        
                            <div className="mb-5">
                            <div className="space-y-2 font-semibold">
                                <div className="rounded border border-[#d3d3d3] dark:border-[#1b2e4b]" key={index + 1}>
                                    <button type="button" className={`flex w-full items-center p-4 text-white-dark dark:bg-[#1b2e4b] ${active === `${index+1}` ? '!text-primary' : ''}`} onClick={() => togglePara(`${index+1}`)}>
                                        <b className='text-xl'>#{index + 1} : {datax.shippingName}</b> &nbsp; | ORDER ID: {datax.pidShippingOnly}
                                        
                                        <div className={`ltr:ml-auto rtl:mr-auto ${active === `${index+1}` ? 'rotate-180' : ''}`}>
                                        <BookDown />
                                        </div>   

                                        <br /><hr />
                                                                                                                    
                                    </button>
                                    <div>
                                        <AnimateHeight duration={300} height={active === `${index+1}` ? 'auto' : 0}>
                                            <div className="space-y-2 border-t border-[#d3d3d3] p-4 text-[13px] text-white-dark dark:border-[#1b2e4b]">
                                                {/* <TableProcurementProducts pidOrder={datax.pidOrder} orderName={datax.orderName} shippingAddress={datax.shippingAddress}  /> */}
                                                Service ID: {datax.pidShippingOnly}
                                                <hr />
                                                Shipping Name: {datax.shippingName}
                                                <hr />
                                                WhatsApp Number: {datax.whatsappNumber}
                                                <hr />
                                                Destination Country: {datax.shippingTo}
                                                <hr />
                                                Gross Weight: {datax.grossWeight}
                                                <hr />
                                                Tracking Number: {datax.trackingNumber}
                                                <hr />
                                                Shipping Plan: {datax.shippingPlan}
                                                <hr />
                                                Expected Shippment: {datax.expectedShipments}
                                                <hr />
                                                Want Product Verification: {datax.wantProductVerification}
                                                <hr />
                                                Want Consolidation: {datax.wantConsolidation}
                                                <hr />
                                                Multiple Suppliers: {datax.multipleSuppliers}
                                                <hr />
                                                Description: {datax.description}
                                                <hr />
                                            </div>

                                            <form onSubmit={handleSubmit}>
                                                    {/* Confirm Action */}
                                                    <div className="space-y-4 p-5">
                                                    <p className="text-red-600 font-medium text-sm dark:text-red-400">Confirm your action</p>
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                        type="checkbox"
                                                        id="confirm"
                                                        className="rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
                                                        required
                                                        />
                                                        <label htmlFor="confirm" className="text-sm text-gray-700 dark:text-gray-300">
                                                        Check this box to confirm your action
                                                        </label>
                                                    </div>
                                                    </div>



                                                    {/* Message to Buyer */}
                                                    <div className='p-5'>
                                                    <textarea
                                                        className="form-textarea w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                                        rows={3}
                                                        placeholder="Send Message to Buyer"
                                                        //value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                    ></textarea>
                                                    </div><br />

                                                    {/* Action Buttons */}
                                                    <div className="p-7 flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
                                                        <div className="w-full md:w-1/2">
                                                            <button type="submit" name="action" value="decline" onClick={() => setActionType('decline')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                                                            DECLINE (Place On-Hold)
                                                            </button>
                                                            <small>Decline Order if there are issues</small>
                                                        </div>
                                                        
                                                        <div className="w-full md:w-1/2">
                                                            <button type="submit" name="action" value="approve" onClick={() => setActionType('approve')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                                                            APPROVE
                                                            </button>
                                                            <small>Approve this Order for further processing</small>
                                                        </div>
                                                    </div>

                                                    </form>

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
function navigateWithAlert(arg0: string, arg1: string, arg2: string) {
  throw new Error('Function not implemented.');
}

