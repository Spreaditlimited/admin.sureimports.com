import Loader from "@/app/uix/Loader";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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

interface ProductProps {
  pidOrder: string;
  pidUser: string;
  orderName: string;
  shippingAddress: string;
}

// USER DATA
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


  

const TableProcurementProducts: React.FC<ProductProps> = ({pidOrder, pidUser, orderName, shippingAddress}) => {

  //initialize alert system
  const navigateWithAlert = useNavigationWithAlert();


  //status
  const status = useSearchParams().get('status') || 'none';
  let newStatus:string = '';


  //important variables
  const [loading, setLoading] = useState<boolean>(true);
  const [productALL, setProductALL] = useState<Product[]>([]);
  const [message, setMessage] = useState<any>('');
  const [actionType, setActionType] = useState<string>('');
  //const [newStatus, setNewStatus] = useState<string>('');



  //************************************ CALCULATIONS ************************************//
  //------------------------- PRODUCTS DATA FOR CALCULATIONS --------------------------//
  //const [pidOrder, setPidOrder] = useState<string>(products[0]?.pidOrder || '');

  const [getAllProducts, setGetAllProducts] = useState<any[]>([]) as any;
  const [productsTotalPrice, setProductsTotalPrice] = useState<number>(0);
  const [productsTotalCount, setProductsTotalCount] = useState<number>(0);
  const [productsTotalWeight, setProductsTotalWeight] = useState<number>(0);

  const [actualWeightValue, setActualWeightValue] = useState<number>(0);
  const [actualDomesticShippingCostValue, setActualDomesticShippingCostValue] = useState<number>(0);

  const [currencyType, setCurrencyType] = useState<string>('...');
  const [currencyName, setCurrencyName] = useState<string>('...');
  const [currencyLogo, setCurrencyLogo] = useState<string>('...');

  const [exNairaToDollar, setExNairaToDollar] = useState<number>(0);
  const [exYuanToDollar, setExYuanToDollar] = useState<number>(0);
  const [exNairaToYuan, setExNairaToYuan] = useState<number>(0);

  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [serviceChargeValue, setServiceChargeValue] = useState<number>(0);
  const [vat, setVat] = useState<number>(0);
  const [vatValue, setVatValue] = useState<number>(0);

  const [actualWeight, setActualWeight] = useState<number>(0);
  const [actualDomesticShippingCost, setActualDomesticShippingCost] = useState<number>(0);

  const [destinationCountry, setDestinationCountry] = useState<string>('...');

  const [shippingPlanName, setShippingPlanName] = useState<string>('...');
  const [shippingPlanRate, setShippingPlanRate] = useState<number>(0);
  const [domesticShippingCost, setDomesticShippingCost] = useState<number>(0);
  const [internationalShippingCost, setInternationalShippingCost] =
    useState<number>(0);
  const [estimatedTotalShippingCost, setEstimatedTotalShippingCost] =
    useState<number>(0);

  const [grandTotalCost, setGrandTotalCost] = useState<number>(0);

  //================OTHER VALUES===============//
  const [amountNaira, setAmountNaira] = useState<number>(0);
  const [amountPounds, setAmountPounds] = useState<number>(0);




  //REPLACE NULL VALUES WITH ZERO
  function replaceNullWithZero<T>(value: T | null): T | number {
    return value === null ? 0 : value;
  }



  //------------------------- GET ALL PRODUCTS DATA & CALCULATIONS FUNCTION --------------------------//
  async function getProductsDetails() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/get-data/procurement-product-data?pidOrder=${pidOrder}`,
        { cache: 'no-store' },
      );

      if (!res.ok) {
        //throw new Error('Failed to fetch data');
        return <div>No Records</div>;
      }

      const data = await res.json();

      // Check if data.productsGetAll is empty or not
      if (data.productsGetAll && data.productsGetAll.length > 0) {

        setProductALL(data.productsGetAll);
        setGetAllProducts(data.productsGetAll) as any;
        setProductsTotalPrice(replaceNullWithZero(data.productsTotalPrice));
        setProductsTotalCount(replaceNullWithZero(data.productsTotalCount));
        setProductsTotalWeight(replaceNullWithZero(data.productsTotalWeight));

        setActualWeightValue(replaceNullWithZero(data.actualWeight));
        setActualDomesticShippingCostValue(replaceNullWithZero(data.actualDomesticShippingCost));

        setCurrencyType(data.currencyType);
        setCurrencyName(data.currencyName);
        setCurrencyLogo(data.currencyLogo);

        setExNairaToDollar(replaceNullWithZero(data.exNairaToDollar));
        setExYuanToDollar(replaceNullWithZero(data.exYuanToDollar));
        setExNairaToYuan(replaceNullWithZero(data.exNairaToYuan));

        setServiceCharge(replaceNullWithZero(data.serviceCharge));
        setServiceChargeValue(replaceNullWithZero(data.serviceChargeValue));
        setVat(replaceNullWithZero(data.vat));
        setVatValue(replaceNullWithZero(data.vatValue));

        setDestinationCountry(data.destinationCountry);

        setShippingPlanName(data.shippingPlanName);
        setShippingPlanRate(replaceNullWithZero(data.shippingPlanRate));
        setDomesticShippingCost(replaceNullWithZero(data.domesticShippingCost));
        setInternationalShippingCost(
          replaceNullWithZero(data.internationalShippingCost),
        );
        setEstimatedTotalShippingCost(
          replaceNullWithZero(data.estimatedTotalShippingCost),
        );

        setAmountNaira(
          replaceNullWithZero(data.grandTotalCost) *
            replaceNullWithZero(data.exNairaToDollar),
        );
        setAmountPounds(replaceNullWithZero(data.grandTotalCost) * 0.8);

        setGrandTotalCost(replaceNullWithZero(data.grandTotalCost));
      } else {
        // Set to an empty array if no records are found
        setGetAllProducts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle the error appropriately (e.g., display an error message)
    } finally {
      setLoading(false); // Set loading to false when done
    }
  }

  //------------------------- RUN THE GET PRODUCT DETAILS FUNCTION --------------------------//
  useEffect(() => {
    getProductsDetails();
  }, []);


   //LOADER & EMPTY RECORD PROCESSING 
   if (loading) {return <Loader />;} //show loader
   if (productALL.length === 0) {
    return (
      <div className="m-7 flex border-spacing-1 items-center justify-center p-7 font-bold">
        <div className="rounded border-2 border-dotted border-gray-500 p-4">
          <p className="text-center text-gray-500">No {status} orders available</p>
        </div>
      </div>
    ); 
  }







  ///////////////////////////////// HANDLE FORM SUBMISSION /////////////////////////////////

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();

          let pidMessage = 'MSG' + new Date().getTime().toString();
          let currentStatus = status;
 
          const formData = new FormData(event.currentTarget);
          formData.append('pidOrder', pidOrder);
          formData.append('pidUser', pidUser);
          formData.append('currentStatus', currentStatus);
          formData.append('newStatus', actionType);
          formData.append('message', message);
          formData.append('pidMessage', pidMessage);

          formData.append('orderShippingCost', estimatedTotalShippingCost.toString());
          formData.append('orderTotalCost', grandTotalCost.toString());
          formData.append('vat', vat.toString());
          formData.append('serviceCharge', serviceCharge.toString());
          formData.append('exchangeRate1', exNairaToDollar.toString());
          formData.append('exchangeRate2', exYuanToDollar.toString());
          formData.append('exchangeRate3', exNairaToYuan.toString());

          formData.append('actualWeight', actualWeight.toString());
          formData.append('actualDomesticShippingCost', actualDomesticShippingCost.toString());
          


          //MAKE REQUEST ATTEMPT
          try {
            toast.info('Processing . . .');
            //MAKE REQUEST
            const res = await fetch('/api/status-processing/procurement', {
              method: 'POST',
              body: formData,
            });
  
        // GET & PROCESS RESPONSE FROM API
        const data:any = await res.json();
  
        if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard/procurement?status='+actionType, 'success', 'Process update was successful, order has been moved to '+actionType);}
        if (data.statusx == 'SUCCESS_MESSAGE'){navigateWithAlert('/dashboard', 'success', 'Message has been successfuly sent to customer. '+actionType);}
        if (data.statusx == 'ACTION_FAILED') {toast.warning(data.message);}
        } catch (error: any) {
            console.log(error.message);
        } finally {
          //setLoading(false);
        }


  }











  return (
    <div className="bg-gray-600 dark:bg-gray-900 min-h-screen p-0 flex flex-col items-center divide-gray-800">
      <div className="w-full bg-yellow bg-gray-200 dark:bg-gray-900 shadow-md p-6 space-y-6">
        

        {/* Order Info */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold dark:text-gray-200">{orderName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ORDER ID: {pidOrder}
            </p>
            <p>
            <span className="font-medium dark:text-gray-300"><b>Delivery Address:</b></span> {shippingAddress}
            </p>
          </div>
          {/* <div className="flex space-x-4">
            <button className="bg-red-500 text-white text-sm py-2 px-4 rounded hover:bg-red-600">
              Take Charge of Order
            </button>
            <button className="bg-blue-500 text-white text-sm py-2 px-4 rounded hover:bg-blue-600">
              Generate Invoice
            </button>
          </div> */}
        </div>



        {/* Table */}
        <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-collapse border border-gray-200 dark:border-gray-300">
  <thead>
    <tr className="bg-gray-100 dark:bg-gray-400 text-gray-700 dark:text-primary-light">
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">S/N</th>
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Product Name</th>
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Unit Price (¥)</th>
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Quantity</th>
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Weight (Kg)</th>
      <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Total Price (¥)</th>
    </tr>
  </thead>

  <tbody>
    {productALL.map((datax: Product, index: number) => (
      <tr key={index + 1} className="dark:text-gray-100">
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
          {index + 1}
        </td>
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
          <p className="text-dark">
            <Link href={datax.productLink} target="blank">
              <b>{datax.productName}</b>
            </Link>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Info: {datax.productInfo}</p>
        </td>
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
          {datax.productPrice}
        </td>
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
          {datax.productQuantity}
        </td>
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
          {datax.productWeight}
        </td>
        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
        {(parseFloat(datax.productQuantity) * parseFloat(datax.productPrice)).toFixed(2)}
        </td>
      </tr>
    ))}
  </tbody>
</table>
          {/* <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Showing 1 to 1 of 1 entries (filtered from 7 total entries)
          </p> */}
        </div>

      



        {/****************************** TOTAL COST OF ORDER *****************************/}
        <div className="flex flex-col gap-4 rounded-lg border border-slate-400 p-[25px]">
          <div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Total Cost of Products
            </div><hr />
            <div className="text-base text-slate-600 dark:text-slate-300 lg:flex lg:gap-3">
              {/* IF IN YAUN DOLLAR VALUE */}
              {currencyType == 'USD' && (
                <>
                  <span className="font-medium text-slate-600">
                    <span className="font font-bold text-gray-800 dark:text-blue-400">
                      {' '}
                      $
                      {
                        (productsTotalPrice as number)
                          .toFixed(2)
                          .toString()
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                      }{' '}
                      USD
                    </span>
                  </span>
                </>
              )}

              {/* IF IN YAUN DOLLAR VALUE */}
              {currencyType == 'CNY' && (
                <>
                  <span className="font-medium text-slate-600">
                    <span className="font font-bold text-gray-800 dark:text-blue-400">
                      {' '}
                      ¥
                      {
                        (((productsTotalPrice as number) / 1) * exYuanToDollar)
                          .toFixed(2)
                          .toString()
                          .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                      }{' '}
                      Yuan
                    </span>

                    <>
                      {'  |  '}
                      <span className="font-medium text-slate-600 dark:text-gray-400">
                        {' '}
                        $
                        {
                          ((productsTotalPrice as number) / 1)
                            .toFixed(2)
                            .toString()
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                        }{' '}
                        USD
                      </span>
                    </>
                  </span>
                </>
              )}

              {/* IF DESTINATION COUNTRY NIGERIA, SHOW VALUE IN NAIRA */}
              {destinationCountry == 'Nigeria' && (
                <>
                  {'  |  '}
                  <span className="font-medium text-slate-600 dark:text-gray-400">
                    {' '}
                    ₦
                    {
                      (((productsTotalPrice as number) / 1) * exNairaToDollar)
                        .toFixed(2)
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                    }{' '}
                    Naira
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        




        {/****************************** TOTAL ESTIMATED SHIPPING COST *****************************/}
        <div className="flex flex-col gap-4 border rounded-lg border-slate-400 p-[25px]">
          <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Estimated Shipping Cost of Order
          </div><hr />

          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Domestic Shipping Cost within China:</p>
            <p>
            $
              {
                ((domesticShippingCost as number) / 1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              &nbsp; USD
            </p>
          </div>

          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">International Shipping Cost:</p>
            <p>
            $
              {
                ((internationalShippingCost as number) / 1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              &nbsp; USD
            </p>
          </div>

          <div className="flex max-md:justify-between md:gap-3">
            <p className="md:w-64"><b>Total Cost:</b></p>
            <span className="font-semibold">
              $<b>
              {
                ((estimatedTotalShippingCost as number) / 1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              </b>
              &nbsp; USD
            </span>

                {/* IF DESTINATION COUNTRY NIGERIA, SHOW VALUE IN NAIRA */}
                {destinationCountry == 'Nigeria' && (
                  <>
                    &nbsp;{' | '}&nbsp;
                    <span className="">
                    ₦
                  {
                      (
                        ((estimatedTotalShippingCost as number) / 1) *
                        exNairaToDollar
                      )
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }
              &nbsp; Naira
            </span>
                  </>
                )}
          </div>
        </div>





        {/****************************** SHIPPING DETAILS *****************************/}
        <div className="flex flex-col gap-4 border rounded-lg border-slate-400 p-[25px]">
          <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Shipping Details
          </div><hr />
          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Estimated Total Weight of Order:</p>{' '}
            <p>
              {
                ((productsTotalWeight as number) / 1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              {' Kg'}
            </p>
          </div>

          {/* SHIPPING DETAILS 1 */}
          {shippingPlanName == 'NORMAL_SHIPPING' && (
            <>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Shipping Type:</p>
                <p>Normal Shipping</p>
              </div>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Rate:</p>
                <p>${shippingPlanRate} (per Kg)</p>
              </div>
            </>
          )}

          {/* SHIPPING DETAILS 2 */}
          {shippingPlanName == 'EXPRESS_SHIPPING' && (
            <>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Shipping Type:</p>
                <p>Express Shipping</p>
              </div>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Rate:</p>
                <p>${shippingPlanRate} (per Kg)</p>
              </div>
            </>
          )}

          {/* SHIPPING DETAILS 3 */}
          {shippingPlanName == 'SPECIAL_SHIPPING' && (
            <>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Shipping Type:</p>
                <p>Special Shipping</p>
              </div>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Rate:</p>
                <p>${shippingPlanRate} (per Kg)</p>
              </div>
            </>
          )}

          {/* SHIPPING DETAILS 4 */}
          {shippingPlanName == 'SEA_SHIPPING' && (
            <>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Shipping Type:</p>
                <p>Sea Shipping</p>
              </div>
              <div className="flex max-md:justify-between md:gap-20">
                <p className="md:w-64"> Rate:</p>
                <p>${shippingPlanRate} (N500,000/CBM)</p>
              </div>
            </>
          )}

          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Destination Country:</p>
            <p>{destinationCountry}</p>
          </div>
          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Port of Exit:</p>
            <p>HONG KONG</p>
          </div>
        </div>





        {/****************************** SERVICE AND VAT CHARGES *****************************/}
        <div className="flex flex-col gap-4 border rounded-lg border-slate-400 p-[25px]">
          <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Service Charge & VAT
          </div><hr />
          <p>
            {serviceCharge}% Service Charge of{' '}
            <span className="font-semibold text-slate-600 dark:text-slate-500">
              $
              {
                ((serviceChargeValue as number) / 1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }{' '}
              USD
            </span>{' '}
            inclusive.<span></span>
          </p>

          <p>
            {vat}% VAT of{' '}
            <span className="font-semibold text-slate-600 dark:text-slate-500">
              $
              {
                (vatValue as number)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }{' '}
              USD
            </span>{' '}
            inclusive.
          </p>


          {/* EXCHANGE RATE FOR USD | YUAN */}
          {currencyType == 'CNY' && (
            <p>
              Exchange Rate (USD | Yuan):
              <span className="font-semibold text-slate-600 dark:text-slate-500">
                {' '}
                $1 USD{' '}
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-500">
                {' '}
                = ¥{exYuanToDollar} Yuan
              </span>
            </p>
          )}


          {/* EXCHANGE RATE FOR USD | NAIRA */}
          {destinationCountry == 'Nigeria' && (
            <p>
              Exchange Rate (USD | Naira):
              <span className="font-semibold text-slate-600 dark:text-slate-500">
                {' '}
                $1 USD{' '}
              </span>
              <span className="font-semibold text-slate-600 dark:text-slate-500">
                {' '}
                = ₦{exNairaToDollar} Naira
              </span>
            </p>
          )}
        </div>






        {/***************************** GRAND TOTAL COST ***************************/}
        <div className="flex items-center gap-4 border rounded-lg border-slate-400 p-[25px]">
          <p className="text-xl font-bold md:pr-[84px]">Grand Total Cost :</p>
          <div>
            {/* GRAND TOTAL */}

            {/* IF IN YAUN DOLLAR VALUE */}
            {currencyType == 'USD' && (
              <>
                <span className="text-2xl font-bold dark:text-blue-400">
                  {' '}
                  $
                  {
                    (grandTotalCost as number)
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }{' '}
                  USD
                </span>
              </>
            )}

            {/* IF IN YAUN DOLLAR VALUE */}
            {currencyType == 'CNY' && (
              <>
                <span className="text-2xl font-bold dark:text-blue-400">
                  {' '}
                  ¥
                  {
                    ((grandTotalCost as number) * exYuanToDollar)
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }{' '}
                  Yuan
                </span>{' '}
                {'  |  '}
                <span className="text-xl font-bold text-gray-500 dark:text-gray-200">
                  {' '}
                  $
                  {
                    (grandTotalCost as number/1)
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }{' '}
                  USD
                </span>{' '}
              </>
            )}

            {/* IF DESTINATION COUNTRY NIGERIA, SHOW VALUE IN NAIRA */}
            {destinationCountry == 'Nigeria' && (
              <>
                {'  |  '}
                <span className="text-xl font-bold text-gray-500 dark:text-gray-200">
                  {' '}
                  ₦
                  {
                    ((grandTotalCost as number) * exNairaToDollar)
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }{' '}
                  Naira
                </span>{' '}
              </>
            )}

            {/* IF DESTINATION COUNTRY United Kingdom, SHOW VALUE IN Pounds */}
            {destinationCountry == 'United Kingdom' && (
              <>
                {'  |  '}
                <span className="text-xl font-bold text-gray-500 dark:text-gray-200">
                  {' '}
                  £
                  {
                    (amountPounds as number)
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }{' '}
                  Pounds
                </span>{' '}
              </>
            )}

            {/* EXTRA CHARGES */}
          </div>
        </div>





{/*------------------ ACTUAL SHIPPING COST DETAILS -----------------*/}
{(status == 'pay-for-shipping') && (
          <>
        {/****************************** TOTAL ESTIMATED SHIPPING COST *****************************/}
        <div className="flex flex-col gap-4 border rounded-lg border-slate-400 p-[25px]">
          <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Actual Shipping Cost of Order
          </div><hr />

          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Actual (Real) Weight of Order:</p>
            <p>
              {
                ((actualWeightValue as number)/1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              &nbsp; Kg
            </p>
          </div>


          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Selected Shipping Plan Rate:</p>
            <p>
            $
              {
                ((shippingPlanRate as number)/1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              &nbsp; / Kg
            </p>
          </div>

          <hr />

          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Actual Domestic Shipping Cost within China:</p>
            <p>
            $
              {
                ((actualDomesticShippingCostValue as number) / 1)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              &nbsp; USD
            </p>
          </div>


          <div className="flex max-md:justify-between md:gap-20">
            <p className="md:w-64">Actual International Shipping Cost:</p>
            <p>
            $
              {
                ((actualWeightValue as number) * shippingPlanRate)
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              &nbsp; USD
            </p>
          </div>

          <hr />

          <div className="flex max-md:justify-between md:gap-3">
            <p className="md:w-64"><b>Actual Total Shipping Cost:</b></p>
            <span className="font-semibold">
              $<b>
              {
                ((((actualWeightValue as number) * shippingPlanRate)/1 + (actualDomesticShippingCostValue as number)/1 ))
                  .toFixed(2)
                  .toString()
                  .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
              }
              </b>
              &nbsp; USD
            </span>

                {/* IF DESTINATION COUNTRY NIGERIA, SHOW VALUE IN NAIRA */}
                {destinationCountry == 'Nigeria' && (
                  <>
                    &nbsp;{' | '}&nbsp;
                    <span className="">
                    ₦
                  {
                      (
                        ((((actualWeightValue as number) * shippingPlanRate) + (actualDomesticShippingCostValue as number))/1) *
                        exNairaToDollar
                      )
                      .toFixed(2)
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                  }
              &nbsp; Naira
            </span>
                  </>
                )}
          </div>
        </div>
        </>
   )}













{/*************************** FORM ***************************/}
 <form onSubmit={handleSubmit}>

        {/* Confirm Action */}
        <div className="space-y-4 pb-5">
          <p className="text-red-600 font-medium text-sm dark:text-red-400">Confirm your action</p>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="confirm"
              className="rounded border-gray-300 dark:border-gray-600 focus:ring-indigo-500"
              required
            />
            <label htmlFor="confirm" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              Check this box to confirm your action
            </label>
          </div>
        </div>


        {/* Message to Buyer */}
        <div>
          <textarea
            className="form-textarea w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            rows={3}
            placeholder="Send Message to Buyer"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div><br />




        {status == 'approved' && (
          <>
        {/****************************** ACTUAL WEIGHT OF ORDER *****************************/}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label
              htmlFor="weight"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Actual Weight of Order
            </label>
            <input
              required
              name="actualWeight"
              type="text"
              id="actualWeight"
              placeholder="Weight in (Kg)Kilograms"
              className="form-textarea w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              *Note: This value must be in (Kg)Kilograms
            </p>
          </div>




          {/****************************** ACTUAL DOMESTIC SHIPPING COST OF ORDER *****************************/}
          <div className="flex-1">
            <label
              htmlFor="totalCost"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Actual Shipping Cost of Order
            </label>
            <input
              required
              name="actualDomesticShippingCost"
              type="text"
              id="actualDomesticShippingCost"
              placeholder="Total Cost of Order in (¥)Yuan"
              className="form-textarea w-full p-3 border rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              *Note: This value must be in (¥)Yuan
            </p>
          </div>
        </div><br />
        </>
        )
      }


















{/* ******************************************* ACTION BUTTONS ************************************************* */}



{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ SAVED ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'saved') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">       
            <div className="w-full md:w-1/1">
                <button type="submit" name="action" value="message" onClick={() => setActionType('message')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  Send Message
                </button>
                <small>You may remind the buyer by sending a message to this order</small>
            </div>
        </div>
        </>
 )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ PENDING - APPROVED ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'pending') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="on-hold" onClick={() => setActionType('on-hold')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="approved" onClick={() => setActionType('approved')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE (Move to Approved)
                </button>
                <small>Approve this Order for further processing</small>
            </div>
        </div>
        </>
   )}





{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ APPROVED - PAY FOR SHIPPING ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'approved') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="on-hold" onClick={() => setActionType('on-hold')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="ready-to-ship" onClick={() => setActionType('pay-for-shipping')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE (Move to Pay-for-Shipping)
                </button>
                <small>Approve this Order for further processing</small>
            </div>
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ PAY FOR SHIPPING - IN TRANSIT ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'pay-for-shipping') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
        <div className="w-full md:w-1/2">
            <button type="submit" name="action" value="message" onClick={() => setActionType('message')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  Send Message
                </button>
                <small>Approve this Order for further processing</small>
            </div>

            {/* <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="decline" onClick={() => setActionType('decline')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="in-transit" onClick={() => setActionType('in-transit')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE
                </button>
                <small>Approve this Order for further processing</small>
            </div> */}
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ IN TRANSIT - READY FOR PICKUP ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'in-transit') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="on-hold" onClick={() => setActionType('on-hold')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="ready-for-pickup" onClick={() => setActionType('ready-for-pickup')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE (Move to Ready for Pickup)
                </button>
                <small>Approve this Order for further processing</small>
            </div>
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ READY FOR PICKUP - COMPLETED ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'ready-for-pickup') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="on-hold" onClick={() => setActionType('on-hold')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="completed" onClick={() => setActionType('completed')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE (Move to Completed)
                </button>
                <small>Approve this Order for further processing</small>
            </div>
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ COMPLETED ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'completed') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            {/* <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="decline" onClick={() => setActionType('decline')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="approve" onClick={() => setActionType('completed')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE
                </button>
                <small>Approve this Order for further processing</small>
            </div> */}
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ ON HOLD - PENDING ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'on-hold') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="on-hold" onClick={() => setActionType('cancelled')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  Cancel Order (Refund Customer)
                </button>
                <small>Cancel Order if persisting issue cannot be resolved</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="pending" onClick={() => setActionType('pending')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  Move back to Pending
                </button>
                <small>Approve this Order for further processing</small>
            </div>
            
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ BANK PENDING (SAVED) - PENDING ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'bank-pending-saved-orders') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="saved" onClick={() => setActionType('saved')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Move back to Saved Order)
                </button>
                <small>Decline Order if Bank Payment failed confirmation</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="pending" onClick={() => setActionType('pending')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE (Move to Pending Order)
                </button>
                <small>Approve this Order for further processing if Bank Payment has been confirmed</small>
            </div>
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ BANK PENDING (SHIPPING) - PAY FOR SHIPPING ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'bank-pending-shipping-orders') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="pay-for-shipping" onClick={() => setActionType('pay-for-shipping')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Move back to Pay for Shipiing)
                </button>
                <small>Decline Order if Bank Payment failed confirmation</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="in-transit" onClick={() => setActionType('in-transit')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                 APPROVED (Move Order to In-Transit)
                </button>
                <small>Approve this Order for further processing if Bank Payment has been confirmed</small>
            </div>
        </div>
        </>
   )}




{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ CANCELLED ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'cancelled') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
            {/* <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="decline" onClick={() => setActionType('decline')} className="w-full btn btn-dark mt-4 bg-gray-700 dark:bg-gray-600 text-white py-3 rounded-md text-sm shadow hover:bg-gray-800 dark:hover:bg-gray-700">
                  DECLINE (Place On-Hold)
                </button>
                <small>Decline Order if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="approve" onClick={() => setActionType('approcacve')} className="btn btn-secondary mt-4 w-full bg-indigo-600 dark:bg-indigo-500 text-white py-3 rounded-md text-sm shadow hover:bg-indigo-700 dark:hover:bg-indigo-600">
                  APPROVE
                </button>
                <small>Approve this Order for further processing</small>
            </div> */}
        </div>
        </>
   )}




</form>





      </div>
    </div>
  );
};

export default TableProcurementProducts;
