'use client';

import React, { useEffect, useRef, useState } from 'react';
//import SearchPage from './order-table-search';

import Image from 'next/image';
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { MdViewWeek } from 'react-icons/md';
import { MdDeleteForever } from 'react-icons/md';
import { RiListView } from 'react-icons/ri';
import { toast } from 'sonner';
import Loader from '@/app/uix/Loader';


interface ProductData {
  id: number;
  pidUser: string;
  pidProduct: string;
  pidOrder: string;
  productName: string;
  productLink: string;
  productCategory: string;
  productPrice: string;
  productWeight: string;
  productQuantity: string;
  productInfo: string;
  createdAt: string;
}

interface MoreOrdersProps {
  products: ProductData[];
}

interface ExchangeRates {
  id: number;
  settings_name: string;
  currency_name1: string;
  currency_sign1: string;
  currency_name2: string;
  currency_sign2: string;
  currency_name3: string;
  currency_sign3: string;
  service_charge: string;
  vat: string;
  exNairaToDollar: string;
  exYuanToDollar: string;
  exNairaToYuan: string;
  status: string;
}

//USER DATA
interface User {
  pidUser: string;
  email: string;
  name: string;
  userImage: string;
  userStatus: string;
}

//API RESPONSE
interface ApiResponse {
  responsex: any;
  successx: boolean;
  userx: User;
}

function MoreOrders({ products }: MoreOrdersProps) {
  const { user, logout } = useAuth(); //DATA FROM SESSION

  const router = useRouter();
  const path = usePathname();

  //LOADERS FOR ORDERS AND PRODUCTS LOADING
  if (!products) return <Loader />;
  if (products.length === 0) {
    return (
      <div className="m-7 flex border-spacing-1 items-center justify-center p-7 font-bold">
        <div className="rounded border-2 border-dotted border-gray-500 p-4">
          <p className="text-center text-gray-500">No products available</p>
        </div>
      </div>
    ); //CHECK IF RECORD IS EMPBY
  }

  // const searchParams = useSearchParams();
  // // const status = searchParams.get('statusx');
  // const [param1, setParam1] = useState(
  //   searchParams.get('statusx') || '',
  // ) as any;
  //const status = params.statusx;

  const status = useSearchParams().get('status') || 'none';
  //get url from www.example.com/products/param1 (Where App Route is "App/products/[id]/page.tsx")
  const params = useParams<{ statusx: string }>(); //id is from [id]

  const status2 = params.statusx;
   
  const [loading, setLoading] = useState(false);

  const [actionType, setActionType] = useState<string>('');



  // REPLACE NULL VALUES WITH ZERO 
  function replaceNullWithZero<T>(value: T | null): T | number {
    return value === null ? 0 : value;
  }
      
  //------------------------RATES & CHARGES----------------------//
  //OTHER RATES
  const [exchangeRates, setExhangeRates] = useState<ExchangeRates[]>([]);

  const [vatChargeRate, setVatChargeRate] = useState<number>(5 / 100);
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(15 / 100); //15% of total price
  //EXCHANGE RATE
  const [exNairToDollar, setExNairToDollar] = useState<number>(1500); //new rate 1745
  const [exYuanToDollar, setExYuanToDollar] = useState<number>(7.13);
  const [exNairaToYuan, setExNairToYuan] = useState<number>(240);
  //SHIPPING RATE
  const [domesticShippingCost, setDomesticShippingCost] = useState<number>(10); //10 usd
  const [shippingRatePerKG, setShippingRate] = useState<number>(5); //10.5 usd per kg

  //SHIPPING PAYMENT PLAN CHARGES
  const [normalShipping, setNormalShipping] = useState<number>(10); //$10 per kg
  const [specialShipping, setSpecialShipping] = useState<number>(11); //$11 per kg
  const [expressShipping, setExpressShipping] = useState<number>(15); //$15 per kg
  const [seaShipping, setSeaShipping] = useState<number>(0); //N500,000/CBM (FOR ONLY NIGERIAN BOUND SHIPPING)

  const [shippingType, setShippingType] = useState<string>('NORMAL_AIR_CARGO');

  //TOTAL SUM OF PRODUCTS IN CART
  const [isDisabled, setIsDisabled] = useState(false);
  const [isDisabled2, setIsDisabled2] = useState(false);
  const [getAllProducts, setGetAllProducts] = useState<ProductData[]>([]);
  const [pidOrder, setPidOrder] = useState<string>(products[0].pidOrder);
  const [productsTotalPrice, setProductsTotalPrice] = useState<number>(0);
  const [productsTotalCount, setProductsTotalCount] = useState<number>(0);
  const [currencyType, setCurrencyType] = useState<string>('');
  const [destinationCountry, setDestinationCountry] = useState<string>('');
  const [productsTotalWeight, setProductsTotalWeight] = useState<number>(0);
  const [productsStatus, setProductsStatus] = useState<string>('');
   
  // SHIPPING DETAILS
  const [internationalShippingCost, setInternationalShippingCost] =
    useState<number>(productsTotalWeight * shippingRatePerKG);
  const [estimatedShippingCost, setEstimatedShippingCost] = useState<number>(
    internationalShippingCost + domesticShippingCost,
  );

  //PRDUCTS TOTAL COST
  const [productsTotalPriceCNY, setProductsTotalPriceCNY] = useState<number>(0);
  const [productsTotalPriceUSD, setProductsTotalPriceUSD] = useState<number>(0);
  const [productsTotalPriceNAIRA, setProductsTotalPriceNAIRA] =
    useState<number>(0);

  //SERVICE CHARGE & VAT
  const [serviceChargeCNY, setServiceChargeCNY] = useState<number>(
    serviceChargeRate * productsTotalPriceCNY,
  ); //15% of total usd per kg
  const [vatValueCNY, setVatValueCNY] = useState<number>(
    vatChargeRate * serviceChargeCNY,
  ); // 7.5 % of service charge per kg

  const [serviceChargeUSD, setServiceChargeUSD] = useState<number>(
    serviceChargeRate * productsTotalPriceUSD,
  ); //15% of total usd per kg
  const [vatValueUSD, setVatValueUSD] = useState<number>(
    vatChargeRate * serviceChargeUSD,
  ); // 7.5 % of service charge per kg

  const [serviceChargeNAIRA, setServiceChargeNAIRA] = useState<number>(
    serviceChargeRate * productsTotalPriceNAIRA,
  ); //15% of total usd per kg
  const [vatValueNAIRA, setVatValueNAIRA] = useState<number>(
    vatChargeRate * serviceChargeNAIRA,
  ); // 7.5 % of service charge per kg

  //PRODUCTS GRAND TOTAL COST
  const [productsGrandTotalPriceCNY, setProductsGrandTotalPriceCNY] =
    useState<number>(productsTotalPriceCNY);
  const [productsGrandTotalPriceUSD, setProductsGrandTotalPriceUSD] =
    useState<number>(productsTotalPriceUSD);
  const [productsGrandTotalPriceNAIRA, setProductsGrandTotalPriceNAIRA] =
    useState<number>(productsTotalPriceNAIRA);

  // GET EXCHANGE RATES
  async function getExchangeRates() {
    try {
      setLoading(true);
      // Pull Records from database
      const res = await fetch(`/api/get-data/exchange-rate`);

      const data = await res.json();
      setExhangeRates(data.getOneRecord);
      alert(exchangeRates);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle the error appropriately (e.g., display an error message)
    } finally {
      //setLoading(false); // Set loading to false when done
    }
  }

  // GET ALL PRODUCTS OF THIS ORDER
  async function getProducts() {
    try {
      setLoading(true);
      // Pull Records from database
      const res = await fetch(
        `/api/get-data/procurement-product-data?pidOrder=${pidOrder}`,
      );

      const data = await res.json();
      setGetAllProducts(data.productsGetAll);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Handle the error appropriately (e.g., display an error message)
    } finally {
      setLoading(false); // Set loading to false when done
    }
  }

  //TABLE RECORDS LOAD FUNCTION
  async function fetchProcuremetnProductData() {
    //check if product data has been loaded
    if (!products) return <Loader />;
    const res = await fetch(
      `/api/get-data/procurement-product-data?pidOrder=${pidOrder}`,
    );

    const data = await res.json();
    const totalPrice = replaceNullWithZero(data.productsTotalPrice);
    const totalCount = replaceNullWithZero(data.productsTotalCount);

    setProductsTotalPrice(totalPrice);
    setProductsTotalCount(totalCount);
    setCurrencyType(data.currencyType);
    setDestinationCountry(data.destinationCountry);
    setProductsTotalWeight(data.productsTotalWeight);
    setInternationalShippingCost(data.productsTotalWeight * shippingRatePerKG);
    setEstimatedShippingCost(
      data.productsTotalWeight * shippingRatePerKG + domesticShippingCost,
    );
    //alert(data.productsTotalWeight);

    //PROCESS USD DATA
    if (data.currencyType == 'USD') {
      const normalShippingX = 10; //$10 per kg
      const specialShippingX = 11; //$15 per kg
      const expressShippingX = 15; //$15 per kg
      const seaShippingX = 10; //N500,000/CBM  (FOR ONLY NIGERIAN BOUND SHIPPING)

      setNormalShipping(normalShippingX);
      setSpecialShipping(specialShippingX);
      setExpressShipping(expressShippingX);
      setSeaShipping(seaShippingX);

      setProductsTotalPriceUSD(totalPrice);
      setProductsTotalPriceCNY(totalPrice * exYuanToDollar);
      setProductsTotalPriceNAIRA(totalPrice * exNairToDollar);

      setServiceChargeCNY(totalPrice * serviceChargeRate);
      setServiceChargeUSD(totalPrice * serviceChargeRate);
      setServiceChargeNAIRA(totalPrice * serviceChargeRate);

      setVatValueCNY(vatChargeRate * serviceChargeCNY);
      setVatValueUSD(vatChargeRate * serviceChargeUSD);
      setVatValueNAIRA(vatChargeRate * serviceChargeNAIRA);

      setProductsGrandTotalPriceUSD(
        totalPrice + serviceChargeUSD + vatValueUSD + estimatedShippingCost,
      );

      setProductsGrandTotalPriceCNY(
        totalPrice * exYuanToDollar +
          serviceChargeCNY * exYuanToDollar +
          vatValueCNY * exYuanToDollar +
          estimatedShippingCost * exYuanToDollar,
      );

      setProductsGrandTotalPriceNAIRA(
        totalPrice * exNairToDollar +
          serviceChargeNAIRA * exNairToDollar +
          vatValueNAIRA * exNairToDollar +
          estimatedShippingCost * exNairToDollar,
      );
    }

    //PROCESS CNY DATA
    if (data.currencyType == 'CNY') {
      const normalShippingX = 10; //$10 per kg
      const specialShippingX = 11; //$15 per kg
      const expressShippingX = 15; //$15 per kg
      const seaShippingX = 10; //N500,000/CBM  (FOR ONLY NIGERIAN BOUND SHIPPING)

      setNormalShipping(normalShippingX);
      setSpecialShipping(specialShippingX);
      setExpressShipping(expressShippingX);
      setSeaShipping(seaShippingX);

      setProductsTotalPriceCNY(totalPrice);
      setProductsTotalPriceUSD(totalPrice * (exYuanToDollar / 1));
      setProductsTotalPriceNAIRA(totalPrice * exNairaToYuan);

      setServiceChargeCNY(totalPrice * serviceChargeRate);
      setServiceChargeUSD(totalPrice * serviceChargeRate);
      setServiceChargeNAIRA(totalPrice * serviceChargeRate);

      setVatValueCNY(vatChargeRate * serviceChargeCNY);
      setVatValueUSD(vatChargeRate * serviceChargeUSD);
      setVatValueNAIRA(vatChargeRate * serviceChargeNAIRA);

      setProductsGrandTotalPriceCNY(
        totalPrice + serviceChargeCNY + vatValueCNY + estimatedShippingCost,
      );

      setProductsGrandTotalPriceUSD(
        totalPrice * (exYuanToDollar / 1) +
          vatValueUSD * (exYuanToDollar / 1) +
          vatValueUSD * (exYuanToDollar / 1) +
          estimatedShippingCost * (exYuanToDollar / 1),
      );

      setProductsGrandTotalPriceNAIRA(
        totalPrice * exNairaToYuan +
          serviceChargeNAIRA * exNairaToYuan +
          vatValueNAIRA * exNairaToYuan +
          estimatedShippingCost * exNairaToYuan,
      );
    }

    if (productsTotalCount === 0) {
      setProductsStatus('Cart is empty!');
    }
  }

  //FETCH PRODUCT DATA TOTAL COST & TOTAL WEIGHT
  useEffect(() => {
    getExchangeRates();
    fetchProcuremetnProductData();
    getProducts();
  }, [estimatedShippingCost]);

  // PAYABLE AMOUNT TO BE CHARGED BY PAYMENT PROCESSOR
  const payableAmount =
    currencyType === 'CNY'
      ? productsGrandTotalPriceCNY
      : currencyType === 'USD'
        ? productsGrandTotalPriceUSD
        : 0;

  const actionProductDelete = async (pidProductx: string) => {
    try {
      toast.info('Processing . . .');
      setLoading(true);
      const res = await fetch(
        `/api/crud/procurement-delete-product/${user?.pidUser}/${pidProductx}`,
      );

      //check if request was successful
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }

      // GET & PROCESS RESPONSE FROM API
      const data: ApiResponse = await res.json();

      if (data.responsex.status == 'SUCCESS') {
        toast.success(data.responsex.message);
        getProducts();
        setLoading(false);
      }
      if (data.responsex.status == 'FAILED') {
        toast.warning(data.responsex.message);
      }
    } catch (error: any) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async () => {
    try {
      toast.info('Processing . . .');

      const res = await fetch(
        `/api/crud/procurement-cancel-order?pidUser=${user?.pidUser}&pidOrder=${pidOrder}`,
      );

      // GET & PROCESS RESPONSE FROM API
      const data: ApiResponse = await res.json();

      if (data.responsex.status == 'SUCCESS') {
        toast.success(data.responsex.message);
        router.push('/dashboard/procurement/view-orders/cancelled');
        navigateWithAlert(
          '/dashboard/procurement/view-orders/cancelled',
          'success',
          'Order has been cancelled!',
        );
      }
      // if (data.responsex.status == 'SUCCESS') {
      //   toast.success(data.responsex.message);
      //   getProducts();
      //   setLoading(false);
      // }
      if (data.responsex.status == 'FAILED') {
        toast.warning(data.responsex.message);
      }
    } catch (error: any) {
      console.log(error.message);
    } finally {
      setLoading(false);
    }
  };





  return (
    <div className="flex flex-col bg-white dark:bg-[#161629]">
      <div className="flex flex-row items-center justify-between p-[25px] max-md:flex-col max-md:items-start max-md:gap-3">
        <div className="text-center text-xl font-bold text-slate-800 dark:text-slate-200">
          {/* {products.length} Products */}
        </div>
      </div>

      {loading ? (
        <div>
          <Loader />
        </div>
      ) : (
        <>
          {/* <!-- Responsive Table Wrapper --> */}
          <div className="overflow-x-auto">
            <table className="min-w-full overflow-hidden bg-white font-bold shadow-md dark:bg-slate-900 dark:text-gray-300">
              <thead className="bg-gray-200 text-sm uppercase leading-normal text-gray-600 dark:bg-gray-200">
                <tr className="dark:bg-gray-800 dark:text-gray-300">
                  <th className="px-6 py-3 text-left">S/N</th>
                  <th className="px-6 py-3 text-left">Product Name</th>
                  <th className="px-6 py-3 text-left">Product Link</th>
                  <th className="px-6 py-3 text-left">
                    Amount ({currencyType})
                  </th>
                  <th className="px-6 py-3 text-left">Quantity</th>
                  <th className="px-6 py-3 text-left">Unit Weight</th>
                  <th className="px-6 py-3 text-left">Total Price</th>
                  {status == 'saved' && (
                    <>
                      <th className="px-6 py-3 text-left">Action</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="text-sm font-light text-gray-600">
                {/** LOOP RECORDS STARTS */}
                {getAllProducts.map((datax: any, index) => {
                  return (
                    <>
                      <tr className="border-b border-gray-200 font-bold hover:bg-gray-100 dark:text-gray-400">
                        <td className="px-6 py-3 text-left">{index + 1}</td>

                        <td className="px-6 py-3 text-left">
                          <Link
                            href={datax.productLink}
                            //target="_blank"
                          >
                            {datax.productName}
                          </Link>
                        </td>

                        <td className="px-6 py-3 text-left">
                          <Link
                            href={datax.productLink}
                            //target="_blank"
                          >
                            {datax.productLink}
                          </Link>
                        </td>

                        <td className="px-6 py-3 text-left">
                          {datax.productPrice}
                        </td>

                        <td className="px-6 py-3 text-left">
                          {datax.productQuantity}
                        </td>

                        <td className="px-6 py-3 text-left">
                          {datax.productWeight}
                        </td>

                        <td className="px-6 py-3 text-left">
                          {datax.productPrice * datax.productQuantity}
                        </td>

                        {status == 'saved' && (
                          <>
                            <td className="flex px-6 py-3 text-left">
                              <Link
                                className="p-2 text-xl"
                                href={
                                  '/dashboard/procurement/edit-product/' +
                                  datax.pidProduct
                                }
                                target="_blank"
                              >
                                <RiListView />
                              </Link>
                              {'   '}

                              <div className="p-2 text-xl">
                                <button
                                  className=""
                                  type="button"
                                  onClick={() =>
                                    actionProductDelete(datax.pidProduct)
                                  }
                                >
                                  <MdDeleteForever />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    </>
                  );
                })}
                {/** LOOP RECORDS ENDS */}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div>{/* <TableData products={products as any} /> */}</div>

      {/* total cost of order */}
      <div className="flex flex-col gap-4 rounded-t-sm border border-slate-200 p-[25px]">
        <div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Total Cost of Order:
          </div>
          <div className="text-base text-slate-600 dark:text-slate-300 lg:flex lg:gap-3">
            {/* IF IN YAUN DOLLAR VALUE */}
            {currencyType == 'USD' && (
              <>
                <span className="font-medium text-slate-600">
                  <span className="font font-bold text-gray-800 dark:text-blue-400">
                    {' '}
                    $
                    {
                      (productsTotalPriceUSD as number)
                        .toFixed(2)
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                    }{' '}
                    USD
                  </span>

                  {/* {'  |  '}

                  <span className="font-medium text-slate-600 dark:text-gray-400">
                    {' '}
                    ¥
                    {
                      (productsTotalPriceCNY as number)
                        .toFixed(2)
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                    }{' '}
                    Yuan
                  </span> */}
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
                      (productsTotalPriceCNY as number)
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
                        (productsTotalPriceUSD as number)
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
                    (productsTotalPriceNAIRA as number)
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
      {/* estimated cost of order */}

      <div className="flex flex-col gap-4 border border-slate-200 p-[25px]">
        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Estimated Shipping Cost of Order:
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex gap-20 text-base text-slate-950 dark:text-white">
            <p className="w-72">Domestic Shipping Cost within China:</p> $
            {
              (domesticShippingCost as number)
                .toFixed(2)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
            }
          </div>
          <div className="flex gap-20 text-base text-slate-950 dark:text-white">
            <p className="w-72">International Shipping Cost:</p> $
            {
              (internationalShippingCost as number)
                .toFixed(2)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
            }
          </div>

          <hr />

          <div className="flex gap-4 text-base text-slate-600 dark:text-white">
            <span className="font-semibold">
              $
              <b>
                {
                  (estimatedShippingCost as number)
                    .toFixed(2)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                }
              </b>
              USD
            </span>

            <span className="font-semibold">
              {/* IF DESTINATION COUNTRY NIGERIA, SHOW VALUE IN NAIRA */}
              {destinationCountry == 'Nigeria' && (
                <>
                  {'  |  '}&nbsp;
                  <span className="">
                    ₦
                    {
                      ((estimatedShippingCost as number) * exNairToDollar)
                        .toFixed(2)
                        .toString()
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                    }{' '}
                    Naira
                  </span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* important notice */}
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-950 shadow-sm dark:border-red-700 dark:bg-red-950/40 dark:text-red-100">
          <div className="text-sm font-bold text-red-800 dark:text-red-200">
            Important Notice:
          </div>
          <div className="mt-1 text-sm font-medium leading-relaxed text-red-950 dark:text-red-100">
            If this cost is higher than the actual cost which will be determined
            later at the China office, we will refund you. If the actual cost is
            higher than this estimated cost, you will be required to make a
            balance payment.
          </div>
        </div>
      </div>

      {/* details */}
      <div className="flex flex-col gap-4 border border-slate-200 p-[25px]">
        <div className="text-lg font-bold text-slate-800 dark:text-slate-200">
          Shipping Details:
        </div>
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
        {shippingType == 'NORMAL_AIR_CARGO' && (
          <>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Shipping Type:</p>
              <p>Normal Shipping</p>
            </div>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Rate:</p>
              <p>${normalShipping} (per Kg)</p>
            </div>
          </>
        )}

        {/* SHIPPING DETAILS 2 */}
        {shippingType == 'EXPRESS_AIR_CARGO' && (
          <>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Shipping Type:</p>
              <p>Special Shipping</p>
            </div>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Rate:</p>
              <p>${specialShipping} (per Kg)</p>
            </div>
          </>
        )}

        {/* SHIPPING DETAILS 3 */}
        {shippingType == 'SPECIAL_AIR_CARGO' && (
          <>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Shipping Type:</p>
              <p>Express Shipping</p>
            </div>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Rate:</p>
              <p>${expressShipping} (per Kg)</p>
            </div>
          </>
        )}

        {/* SHIPPING DETAILS 4 */}
        {shippingType == 'SEA_SHIPPING' && (
          <>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Shipping Type:</p>
              <p>Sea Shipping</p>
            </div>
            <div className="flex max-md:justify-between md:gap-20">
              <p className="md:w-64"> Rate:</p>
              <p>${seaShipping} (N500,000/CBM)</p>
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
      <div className="flex items-center gap-4 border border-slate-200 p-[25px]">
        <p className="text-xl font-bold md:pr-[84px]">Grand total cost:</p>
        <div>
          {/* GRAND TOTAL */}

          {/* IF IN YAUN DOLLAR VALUE */}
          {currencyType == 'USD' && (
            <>
              <span className="text-2xl font-bold dark:text-blue-400">
                {' '}
                $
                {
                  (productsGrandTotalPriceUSD as number)
                    .toFixed(2)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                }{' '}
                USD
              </span>
              {/* {'  |  '}
              <span className="text-xl font-bold text-gray-500 dark:text-gray-200">
                {' '}
                ¥
                {
                  (productsGrandTotalPriceCNY as number)
                    .toFixed(2)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                }{' '}
                Yuan
              </span>{' '} */}
            </>
          )}

          {/* IF IN YAUN DOLLAR VALUE */}
          {currencyType == 'CNY' && (
            <>
              <span className="text-2xl font-bold dark:text-blue-400">
                {' '}
                ¥
                {
                  (productsGrandTotalPriceCNY as number)
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
                  (productsGrandTotalPriceUSD as number)
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
                  (productsGrandTotalPriceNAIRA as number)
                    .toFixed(2)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
                }{' '}
                Naira
              </span>{' '}
            </>
          )}

          {/* GRAND TOTAL */}
        </div>
      </div>
      <div className="flex flex-col gap-4 border-slate-200 p-[25px] dark:border">
        {/* SERVICE & VAT CHARGE */}
        <p>
          {serviceChargeRate * 100}% Service Charge of{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-500">
            $
            {
              (serviceChargeUSD as number)
                .toFixed(2)
                .toString()
                .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string
            }{' '}
            USD
          </span>{' '}
          inclusive.<span></span>
        </p>

        <p>
          {vatChargeRate * 100}% VAT of{' '}
          <span className="font-semibold text-slate-600 dark:text-slate-500">
            $
            {
              (vatValueUSD as number)
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
              = ¥7.13 Yuan
            </span>
          </p>
        )}

        {/* EXCHANGE RATE FOR YUAN | NAIRA */}
        {currencyType == 'CNY' && destinationCountry == 'Nigeria' && (
          <p>
            Exchange Rate (Yuan | Naira):
            <span className="font-semibold text-slate-600 dark:text-slate-500">
              {' '}
              ¥1 Yuan{' '}
            </span>
            <span className="font-semibold text-slate-600 dark:text-slate-500">
              {' '}
              = ₦240 Naira
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
              = ₦{exNairToDollar} Naira
            </span>
          </p>
        )}
      </div>
      {status == 'saved' && (
        <>
          <div className="flex flex-col justify-between border border-slate-200 p-[25px] max-xl:gap-4 xl:flex-row xl:items-center">
            <div className="flex flex-col items-center text-base text-slate-800 dark:text-slate-200 max-md:items-start max-md:gap-3 lg:items-start">
              <div className="pb-3">
                Agree to{' '}
                <Link href="/terms-and-conditions">
                  <span className="pb-5 text-indigo-800">
                    Terms & Condition
                  </span>
                </Link>
              </div>
              <div className="flex text-sm text-slate-800 dark:text-slate-400 max-md:items-start max-md:gap-3 md:text-center lg:items-center lg:gap-2">
                {/* <Checkbox  /> */}
                <input
                  type="checkbox"
                  checked={isDisabled}
                  onChange={(e) => setIsDisabled(e.target.checked)}
                  className="h-4 w-4"
                />
                You must agree to our Terms & Conditions before proceeding
              </div>
              <br />
              <div className="dark:text-yellow-200d text-sm text-blue-800">
                Please note that card payment cannot exceed $1,000 USD or
                N500,000 Naira
              </div>
              <br />
            </div>

            <div className="flex flex-col gap-[15px] lg:flex-row">


            {(status !== 'saved') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mt-6">
            
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
        </>
        )}



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


            </div>
          </div>
        </>
      )}


    </div>
  );
}

export default MoreOrders;
function navigateWithAlert(arg0: string, arg1: string, arg2: string) {
  throw new Error('Function not implemented.');
}
