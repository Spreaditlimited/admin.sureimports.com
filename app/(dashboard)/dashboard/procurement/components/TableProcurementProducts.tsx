import Loader from "@/app/uix/Loader";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

// (Assuming PrismaClient is used in an API route, not directly here since this is 'use client', 
// but leaving your imports intact as requested)
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

interface User {
  pidUser: string;
  email: string;
  name: string;
}

interface ApiResponse {
  responsex: any;
  successx: boolean;
  userx: User;
}

const TableProcurementProducts: React.FC<ProductProps> = ({pidOrder, pidUser, orderName, shippingAddress}) => {

  const navigateWithAlert = useNavigationWithAlert();
  const status = useSearchParams().get('status') || 'none';
  let newStatus:string = '';
  const showActualShippingBreakdown = [
    'pay-for-shipping',
    'bank-pending-shipping-orders',
    'in-transit',
    'ready-for-pickup',
    'completed',
  ].includes(status);

  const [loading, setLoading] = useState<boolean>(true);
  const [productALL, setProductALL] = useState<Product[]>([]);
  const [message, setMessage] = useState<any>('');
  const [actionType, setActionType] = useState<string>('');
  const [confirmAction, setConfirmAction] = useState<boolean>(false);
  const [isActionConfirmOpen, setIsActionConfirmOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{ value: string; label: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const router = useRouter();
  const [getAllProducts, setGetAllProducts] = useState<any[]>([]) as any;
  const [productsTotalPrice, setProductsTotalPrice] = useState<number>(0);
  const [productsTotalCount, setProductsTotalCount] = useState<number>(0);
  const [productsTotalWeight, setProductsTotalWeight] = useState<number>(0);

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

  const [actualWeightValue, setActualWeightValue] = useState<number>(0);
  const [actualDomesticShippingCostValue, setActualDomesticShippingCostValue] = useState<number>(0);

  const [actualWeight, setActualWeight] = useState<number>(0);
  const [actualDomesticShippingCost, setActualDomesticShippingCost] = useState<number>(0);
  const [actualInternationalShippingCost, setActualInternationalShippingCost] = useState<number>(0);
  const [actualTotalShippingCost, setActualTotalShippingCost] = useState<number>(0);
  const [costDifference, setCostDifference] = useState<number>(0);

  const [destinationCountry, setDestinationCountry] = useState<string>('...');

  const [shippingPlanName, setShippingPlanName] = useState<string>('...');
  const [shippingPlanRate, setShippingPlanRate] = useState<number>(0);
  const [domesticShippingCost, setDomesticShippingCost] = useState<number>(0);
  const [internationalShippingCost, setInternationalShippingCost] = useState<number>(0);
  const [estimatedTotalShippingCost, setEstimatedTotalShippingCost] = useState<number>(0);

  const [trackingCompany, setTrackingCompany] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [trackingLink, setTrackingLink] = useState<string>('');

  const [additionalCost, setAdditionalCost] = useState<number>(0);
  const [additionalCostDescription, setAdditionalCostDescription] = useState<string>('');

  const [grandTotalCost, setGrandTotalCost] = useState<number>(0);
  const [amountNaira, setAmountNaira] = useState<number>(0);
  const [amountPounds, setAmountPounds] = useState<number>(0);

  function replaceNullWithZero<T>(value: T | null): T | number {
    return value === null ? 0 : value;
  }

  async function getProductsDetails() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/get-data/procurement-product-data?pidOrder=${pidOrder}`,
        { cache: 'no-store' },
      );

      if (!res.ok) return <div>No Records</div>;
      const data = await res.json();

      if (data.productsGetAll && data.productsGetAll.length > 0) {
        setProductALL(data.productsGetAll);
        setGetAllProducts(data.productsGetAll) as any;
        setProductsTotalPrice(replaceNullWithZero(data.productsTotalPrice));
        setProductsTotalCount(replaceNullWithZero(data.productsTotalCount));
        setProductsTotalWeight(replaceNullWithZero(data.productsTotalWeight));

        setActualWeightValue(replaceNullWithZero(data.actualWeight));
        setActualDomesticShippingCostValue(replaceNullWithZero(data.actualDomesticShippingCost));
        setActualInternationalShippingCost(replaceNullWithZero(data.actualInternationalShippingCost));
        setActualTotalShippingCost(replaceNullWithZero(data.actualTotalShippingCost));
        setCostDifference(replaceNullWithZero(data.costDifference));

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
        setInternationalShippingCost(replaceNullWithZero(data.internationalShippingCost));
        setEstimatedTotalShippingCost(replaceNullWithZero(data.estimatedTotalShippingCost));

        setAmountNaira(replaceNullWithZero(data.grandTotalCost) * replaceNullWithZero(data.exNairaToDollar));
        setAmountPounds(replaceNullWithZero(data.grandTotalCost) * 0.8);
        setGrandTotalCost(replaceNullWithZero(data.grandTotalCost));
      } else {
        setGetAllProducts([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false); 
    }
  }

  useEffect(() => {
    getProductsDetails();
  }, []);

  const openActionConfirm = (value: string, label: string) => {
    if (!confirmAction) {
      toast.warning('Please confirm action to proceed.');
      return;
    }
    setPendingAction({ value, label });
    setIsActionConfirmOpen(true);
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    const action = pendingAction.value;
    setActionType(action);
    setIsActionConfirmOpen(false);

    const form = formRef.current;
    if (!form) return;

    const submitter = document.createElement('button');
    submitter.type = 'submit';
    submitter.name = 'action';
    submitter.value = action;
    submitter.hidden = true;
    form.appendChild(submitter);
    form.requestSubmit(submitter);
    submitter.remove();
  };

  const getActionConfirmText = () => {
    if (!pendingAction) return 'Are you sure you want to proceed with this order action?';
    if (pendingAction.value === 'on-hold') return 'Are you sure you want to decline this order and place it on hold?';
    if (pendingAction.value === 'saved') return 'Are you sure you want to decline this payment and move the order back to Saved?';
    if (pendingAction.value === 'pay-for-shipping' && status === 'bank-pending-shipping-orders') {
      return 'Are you sure you want to decline this shipping payment and move the order back to Pay for Shipping?';
    }
    if (pendingAction.value === 'pay-for-shipping') {
      return 'Are you sure you want to approve this order and move it to Pay for Shipping?';
    }
    return `Are you sure you want to ${pendingAction.label.toLowerCase()}?`;
  };

  if (loading) return <Loader />;
  if (productALL.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 mt-4 bg-card border border-border shadow-soft rounded-lg">
        <p className="text-muted-foreground font-medium">No {status} orders available</p>
      </div>
    ); 
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nativeSubmitEvent = event.nativeEvent as SubmitEvent;
    const submitter = nativeSubmitEvent.submitter as HTMLButtonElement | null;
    const nextAction = submitter?.value || actionType;

    if (!confirmAction) {
      toast.warning('Please confirm action to proceed.');
      return;
    }

    if (status === 'approved' && nextAction === 'pay-for-shipping') {
      const actualWeightInput = (event.currentTarget.elements.namedItem('actualWeight') as HTMLInputElement | null)?.value?.trim() || '';
      const actualDomesticInput = (event.currentTarget.elements.namedItem('actualDomesticShippingCost') as HTMLInputElement | null)?.value?.trim() || '';

      if (!actualWeightInput || !actualDomesticInput) {
        toast.warning('Actual weight and domestic shipping cost are required for approval.');
        return;
      }
    }

    let pidMessage = 'MSG' + new Date().getTime().toString();
    let currentStatus = status;

    const formData = new FormData(event.currentTarget);
    formData.append('pidOrder', pidOrder);
    formData.append('pidUser', pidUser);
    formData.append('currentStatus', currentStatus);
    formData.append('newStatus', nextAction);
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
    formData.append('trackingNumber', trackingNumber.toString());
    formData.append('additionalCost', additionalCost.toString());
    formData.append('additionalCostDescription', additionalCostDescription.toString());

    try {
      toast.info('Processing . . .');
      const res = await fetch('/api/status-processing/procurement', {
        method: 'POST',
        body: formData,
      });

      const data:any = await res.json();

      if (data.statusx == 'SUCCESS') navigateWithAlert('/dashboard/procurement?status='+nextAction, 'success', 'Process update was successful, order has been moved to '+nextAction);
      if (data.statusx == 'SUCCESS_MESSAGE') navigateWithAlert('/dashboard', 'success', 'Message has been successfuly sent to customer. '+nextAction);
      if (data.statusx == 'ACTION_FAILED') toast.warning(data.message);
      if (data.statusx == 'REVERT_TO_APPROVED') {toast.success(data.message);  router.push('/dashboard/procurement?status=approved');}
      if (data.statusx == 'SUCCESS_TRACKING_NUMBER') toast.info(data.message);
      if (data.statusx == 'EMPTY_TRACKING_DATA') toast.warning(data.message);
      
    } catch (error: any) {
        console.log(error.message);
    }
  }

  return (
    <div className="w-full mt-4 space-y-6">
      
      {/* Order Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border rounded-lg p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">{orderName}</h2>
          <p className="text-sm text-muted-foreground mb-2">ORDER ID: <span className="font-medium text-foreground">{pidOrder}</span></p>
          <p className="text-sm text-foreground">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs">Delivery Address: </span> 
            {shippingAddress}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-4 py-3 text-center">S/N</th>
              <th className="px-4 py-3">Product Name</th>
              <th className="px-4 py-3 text-center">Unit Price ({currencyType})</th>
              <th className="px-4 py-3 text-center">Quantity</th>
              <th className="px-4 py-3 text-center">Weight (Kg)</th>
              <th className="px-4 py-3 text-center">Total Price ({currencyType})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card text-foreground">
            {productALL.map((datax: Product, index: number) => (
              <tr key={index + 1} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-center">{index + 1}</td>
                <td className="px-4 py-3">
                  <Link href={datax.productLink} target="blank" className="font-semibold text-primary hover:underline">
                    {datax.productName}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">Info: {datax.productInfo}</p>
                </td>
                <td className="px-4 py-3 text-center">{datax.productPrice}</td>
                <td className="px-4 py-3 text-center">{datax.productQuantity}</td>
                <td className="px-4 py-3 text-center">{datax.productWeight}</td>
                <td className="px-4 py-3 text-center font-medium">
                  {(parseFloat(datax.productQuantity) * parseFloat(datax.productPrice)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Total Cost of Products */}
        <div className="bg-card border border-border shadow-sm rounded-lg p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">Total Cost of Products</h3>
          <div className="flex flex-wrap items-center gap-2 text-base text-muted-foreground">
            {currencyType == 'USD' && (
              <span className="font-bold text-primary text-xl">
                ${((productsTotalPrice as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
              </span>
            )}
            {currencyType == 'CNY' && (
              <>
                <span className="font-bold text-primary text-xl">
                  ¥{(((productsTotalPrice as number) / 1) * exYuanToDollar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Yuan
                </span>
                <span className="text-foreground font-medium"> | </span>
                <span className="font-semibold text-foreground">
                  ${((productsTotalPrice as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
                </span>
              </>
            )}
            {destinationCountry == 'Nigeria' && (
              <>
                <span className="text-foreground font-medium"> | </span>
                <span className="font-semibold text-foreground">
                  ₦{(((productsTotalPrice as number) / 1) * exNairaToDollar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Naira
                </span>
              </>
            )}
          </div>
        </div>

        {/* Estimated Shipping Cost */}
        <div className="bg-card border border-border shadow-sm rounded-lg p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">Estimated Shipping Cost</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Domestic Shipping (China):</span>
              <span className="font-medium text-foreground">${((domesticShippingCost as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">International Shipping:</span>
              <span className="font-medium text-foreground">
                ${(['saved', 'on-hold'].includes(status) ? internationalShippingCost : (estimatedTotalShippingCost - domesticShippingCost)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
              </span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-border mt-3">
              <span className="font-bold text-foreground">Total Cost:</span>
              <div className="text-right">
                <span className="font-bold text-primary text-lg">
                  ${((estimatedTotalShippingCost as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
                </span>
                {destinationCountry == 'Nigeria' && (
                  <span className="block text-xs font-medium text-muted-foreground mt-1">
                    ₦{(((estimatedTotalShippingCost as number) / 1) * exNairaToDollar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Naira
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Details */}
        <div className="bg-card border border-border shadow-sm rounded-lg p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">Shipping Details</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping Plan:</span>
              <span className="font-medium text-foreground">{shippingPlanName || 'Not Specified'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping Rate:</span>
              <span className="font-medium text-foreground">${shippingPlanRate}/Kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Total Weight:</span>
              <span className="font-medium text-foreground">{((productsTotalWeight as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Destination:</span>
              <span className="font-medium text-foreground">{destinationCountry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Port of Exit:</span>
              <span className="font-medium text-foreground">HONG KONG</span>
            </div>
          </div>
        </div>

        {/* Service & VAT Charges */}
        <div className="bg-card border border-border shadow-sm rounded-lg p-5">
          <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">Service Charge & VAT</h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">{serviceCharge}%</span> Service Charge of <span className="font-semibold text-foreground">${((serviceChargeValue as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span> inclusive.
            </p>
            <p>
              <span className="font-semibold text-foreground">{vat}%</span> VAT of <span className="font-semibold text-foreground">${(vatValue as number).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span> inclusive.
            </p>
            <div className="pt-3 border-t border-border mt-3 space-y-1">
              <p className="font-medium text-foreground mb-2">Exchange Rates:</p>
              {currencyType == 'CNY' && <p>$1 USD = <span className="font-semibold text-foreground">¥{exYuanToDollar} Yuan</span></p>}
              {destinationCountry == 'Nigeria' && <p>$1 USD = <span className="font-semibold text-foreground">₦{exNairaToDollar} Naira</span></p>}
            </div>
          </div>
        </div>
      </div>

      {/* Grand Total Cost */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-primary/10 border border-primary/20 rounded-lg p-6 shadow-sm">
        <p className="text-lg font-bold text-foreground">Grand Total Cost</p>
        <div className="flex flex-wrap items-center gap-3">
          {currencyType == 'USD' && (
            <span className="text-2xl font-bold text-primary">
              ${((grandTotalCost as number)/1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
            </span>
          )}
          {currencyType == 'CNY' && (
            <>
              <span className="text-2xl font-bold text-primary">
                ¥{((grandTotalCost as number) * exYuanToDollar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Yuan
              </span>
              <span className="text-muted-foreground"> | </span>
              <span className="text-xl font-bold text-foreground">
                ${((grandTotalCost as number)/1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
              </span>
            </>
          )}
          {destinationCountry == 'Nigeria' && (
            <>
              <span className="text-muted-foreground"> | </span>
              <span className="text-xl font-bold text-foreground">
                ₦{((grandTotalCost as number) * exNairaToDollar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Naira
              </span>
            </>
          )}
          {destinationCountry == 'United Kingdom' && (
            <>
              <span className="text-muted-foreground"> | </span>
              <span className="text-xl font-bold text-foreground">
                £{(amountPounds as number).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Pounds
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actual Shipping Cost Details */}
      {showActualShippingBreakdown && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border shadow-sm rounded-lg p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">Actual Shipping Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Weight:</span>
                <span className="font-medium text-foreground">{((actualWeightValue as number)/1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan Rate:</span>
                <span className="font-medium text-foreground">${((shippingPlanRate as number)/1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} / Kg</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-border mt-3">
                <span className="text-muted-foreground">Actual Domestic (China):</span>
                <span className="font-medium text-foreground">${((actualDomesticShippingCostValue as number) / 1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual International:</span>
                <span className="font-medium text-foreground">${(actualInternationalShippingCost as number).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border mt-3">
                <span className="font-bold text-foreground">Actual Total:</span>
                <div className="text-right">
                  <span className="font-bold text-primary text-lg">
                    ${(((actualTotalShippingCost as number)/1 )).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
                  </span>
                  {destinationCountry == 'Nigeria' && (
                    <span className="block text-xs font-medium text-muted-foreground mt-1">
                      ₦{((((actualTotalShippingCost as number)/1 )) * exNairaToDollar).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Naira
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border shadow-sm rounded-lg p-5">
            <h3 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">Balance / Refund Calculation</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Actual Total Cost:</span>
                <span className="font-medium text-foreground">${(((actualTotalShippingCost as number)/1 )).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Initial Estimated Cost:</span>
                <span className="font-medium text-foreground">${((estimatedTotalShippingCost as number)/1).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD</span>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-border mt-3">
                { (actualTotalShippingCost - estimatedTotalShippingCost) > 0 && <span className="font-bold text-destructive">Amount to Pay:</span> }
                { (actualTotalShippingCost - estimatedTotalShippingCost) < 0 && <span className="font-bold text-emerald-600">Refund Balance:</span> }
                { (actualTotalShippingCost - estimatedTotalShippingCost) == 0 && <span className="font-bold text-muted-foreground">No Payment Required</span> }
                
                { (actualTotalShippingCost - estimatedTotalShippingCost) !== 0 && (
                  <div className="text-right">
                    <span className={`font-bold text-lg ${actualTotalShippingCost > estimatedTotalShippingCost ? 'text-destructive' : 'text-emerald-600'}`}>
                      ${Math.abs(((actualTotalShippingCost - estimatedTotalShippingCost as number)/1)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} USD
                    </span>
                    {destinationCountry == 'Nigeria' && (
                      <span className="block text-xs font-medium text-muted-foreground mt-1">
                        ₦{Math.abs((((actualTotalShippingCost - estimatedTotalShippingCost) * exNairaToDollar)/1)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} Naira
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Area */}
      <form ref={formRef} onSubmit={handleSubmit} className="bg-card border border-border shadow-sm rounded-lg p-5 sm:p-6 space-y-6 mt-8">
        
        {status != 'completed' && (
          <div className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">Message to Buyer</label>
              <textarea
                id="message"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                rows={3}
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-md border border-border">
              <input
                type="checkbox"
                id="confirm"
                checked={confirmAction}
                onChange={(e) => setConfirmAction(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              />
              <label htmlFor="confirm" className="text-sm font-medium text-foreground cursor-pointer">
                Confirm action to proceed
              </label>
            </div>
          </div>
        )}

        {status == 'approved' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
            <div>
              <label htmlFor="actualWeight" className="block text-sm font-medium text-foreground mb-1">Actual Weight (Kg)</label>
              <input
                name="actualWeight"
                type="number"
                step="any"
                id="actualWeight"
                placeholder="e.g. 2.5"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div>
              <label htmlFor="actualDomesticShippingCost" className="block text-sm font-medium text-foreground mb-1">Actual Domestic Shipping (¥ Yuan)</label>
              <input
                name="actualDomesticShippingCost"
                type="number"
                step="any"
                id="actualDomesticShippingCost"
                placeholder="e.g. 45"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
          </div>
        )}

        {status == 'in-transit' && (
          <div className="space-y-6 pt-4 border-t border-border">
            <h3 className="text-sm font-bold text-foreground">Tracking Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tracking Company</label>
                <input
                  defaultValue={trackingCompany}
                  name="trackingCompany"
                  type="text"
                  placeholder="Company Name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tracking Number</label>
                <input
                  name="trackingNumber"
                  type="text"
                  placeholder="Number"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Tracking Link</label>
                <input
                  name="trackingLink"
                  type="text"
                  placeholder="URL"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end">
               <button type="submit" name="action" value="tracking-number-update" onClick={() => setActionType('tracking-number-update')} className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Update Tracking Data
              </button>
            </div>

            <h3 className="text-sm font-bold text-foreground pt-4 border-t border-border">Additional Costs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Additional Cost (USD)</label>
                <input
                  name="additionalCost"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
                <input
                  name="additionalCostDescription"
                  type="text"
                  placeholder="Reason for cost..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Container */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-6 border-t border-border">
          
          {(status == 'saved') && (
            <button type="submit" value="message" onClick={() => setActionType('message')} disabled={!confirmAction} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              Send Message to Buyer
            </button>
          )}

          {(status == 'pending') && (
            <>
              <button type="button" onClick={() => openActionConfirm('on-hold', 'Decline (On-Hold)')} disabled={!confirmAction} className="w-full sm:w-1/2 whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:ring-offset-card shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Decline (On-Hold)
              </button>
              <button type="button" onClick={() => openActionConfirm('approved', 'Approve Order')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Approve Order
              </button>
            </>
          )}

          {(status == 'approved') && (
            <>
              <button type="button" onClick={() => openActionConfirm('on-hold', 'Decline (On-Hold)')} disabled={!confirmAction} className="w-full sm:w-1/2 whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:ring-offset-card shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Decline (On-Hold)
              </button>
              <button type="button" onClick={() => openActionConfirm('pay-for-shipping', 'Approve (Move to Pay Shipping)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Approve (Move to Pay Shipping)
              </button>
            </>
          )}

          {(status == 'pay-for-shipping') && (
            <>
              <button type="submit" value="message" onClick={() => setActionType('message')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Send Message
              </button>
              <button type="submit" value="revert_to_approved" onClick={() => setActionType('revert_to_approved')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-muted text-foreground hover:bg-muted/80 border border-border py-2.5 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Revert to Approved
              </button>
            </>
          )}

          {(status == 'in-transit') && (
             <>
             <button type="button" onClick={() => openActionConfirm('on-hold', 'Decline (On-Hold)')} disabled={!confirmAction} className="w-full sm:w-1/2 whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:ring-offset-card shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Decline (On-Hold)
             </button>
             <button type="button" onClick={() => openActionConfirm('ready-for-pickup', 'Approve (Ready for Pickup)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Approve (Ready for Pickup)
             </button>
           </>
          )}

          {(status == 'ready-for-pickup') && (
             <>
             <button type="button" onClick={() => openActionConfirm('on-hold', 'Decline (On-Hold)')} disabled={!confirmAction} className="w-full sm:w-1/2 whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-1 focus:ring-offset-card shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Decline (On-Hold)
             </button>
             <button type="button" onClick={() => openActionConfirm('completed', 'Approve (Completed)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Approve (Completed)
             </button>
           </>
          )}

          {(status == 'on-hold') && (
             <>
             <button type="submit" value="cancelled" onClick={() => setActionType('cancelled')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-destructive text-destructive-foreground hover:bg-destructive/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Cancel Order (Refund)
             </button>
             <button type="submit" value="pending" onClick={() => setActionType('pending')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Move back to Pending
             </button>
           </>
          )}

          {(status == 'bank-pending-saved-orders') && (
             <>
             <button type="button" onClick={() => openActionConfirm('saved', 'Decline (Back to Saved)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-muted text-foreground hover:bg-muted/80 border border-border py-2.5 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
               Decline (Back to Saved)
             </button>
             <button type="button" onClick={() => openActionConfirm('pending', 'Approve (Move to Pending)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Approve (Move to Pending)
             </button>
           </>
          )}

          {(status == 'bank-pending-shipping-orders') && (
             <>
             <button type="button" onClick={() => openActionConfirm('pay-for-shipping', 'Decline (Back to Pay Shipping)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-muted text-foreground hover:bg-muted/80 border border-border py-2.5 px-4 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
               Decline (Back to Pay Shipping)
             </button>
             <button type="button" onClick={() => openActionConfirm('in-transit', 'Approve (Move to In-Transit)')} disabled={!confirmAction} className="w-full sm:w-1/2 bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
               Approve (Move to In-Transit)
             </button>
           </>
          )}

        </div>
      </form>

      {isActionConfirmOpen && pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-xl bg-card border border-border shadow-soft">
            <div className="p-6">
              <h3 className="mb-2 text-center text-xl font-bold text-foreground tracking-tight">
                Confirm Action
              </h3>
              <p className="mb-6 text-center text-sm text-muted-foreground">
                {getActionConfirmText()}
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsActionConfirmOpen(false);
                    setPendingAction(null);
                  }}
                  className="flex-1 rounded-md bg-muted px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/80 border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmPendingAction}
                  className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TableProcurementProducts;
