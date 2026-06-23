'use client';


import React, { useEffect, useState } from 'react';
import AnimateHeight from 'react-animate-height';
import Loader from '@/app/uix/Loader';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CornerRightDown, Layers, Package } from 'lucide-react';
import { getTimeDifference } from '@/lib/getTimeDifference';
import { useNavigationWithAlert } from '@/app/hooks/useNavigationWithAlert';

function buildPaySupplierAssetUrl(value?: string | null) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;

    const base = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL?.replace(/\/$/, '');
    if (!base) return '';

    if (raw.includes('/')) return `${base}/${raw}`;
    return `${base}/sureimports/pay-supplier/${raw}`;
}

function isPdfAsset(value: string) {
    return /\.pdf($|\?)/i.test(value);
}

function AttachmentCard({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    const url = buildPaySupplierAssetUrl(value);
    if (!url) return null;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg border border-border bg-background p-3 transition hover:bg-muted/50"
        >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            {isPdfAsset(url) ? (
                <div className="mt-3 flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-card text-sm font-semibold text-primary">
                    View PDF
                </div>
            ) : (
                <img
                    src={url}
                    alt={label}
                    className="mt-3 h-28 w-full rounded-lg object-cover"
                />
            )}
        </a>
    );
}

const DetailItem = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            {label}
        </span>
        <span className="text-sm font-semibold text-foreground break-words">
            {value}
        </span>
    </div>
);


interface Order {
    id: number;
    pidPaySupplier: string;
    pidUser: string;
    supplierName: string;
    supplierPhone: string;
    supplierEmail: string;
    aliPayAccountQRCodeImage: string;
    weChatAccountQRCodeImage: string;
    proformaInvoiceImage: string;
    supplierBankAccountDetails: string;
    amountToPayInYuan: string;
    amountToPayInNaira: string;
    serviceCharge: string;
    status: string;
    createdAt: string;
    updatedAt: string | null;
  }

function formatPaySupplierTime(value?: string | null) {
    return value ? getTimeDifference(value) : 'Time unavailable';
}

function formatStatusLabel(value: string) {
    const labels: Record<string, string> = {
        saved: 'Saved Requests',
        'pending-payment': 'Bank Pending',
        'paid-supplier': 'Paid Supplier',
        'request-cancelled': 'Request Cancelled',
    };
    return labels[value] || value.replace(/-/g, ' ');
}



const ComponentsAccordionsBasic = () => {
    const navigateWithAlert = useNavigationWithAlert();


    // VARIABLES
    const [active, setActive] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const togglePara = (value: string) => {
        setActive((oldValue) => {
            return oldValue === value ? '' : value;
        });
    };



    // VARIABLES 
    const status = useSearchParams().get('status') || 'none'; // Get the current 'status' value
    const [orderALL, setOrderALL] = useState<Order[]>([]);
    const [message, setMessage] = useState<any>('');
    const [actionType, setActionType] = useState<string>('');
    



    //GET RECORDS FROM DATABASE
    async function fetchDataOrder() {
        try {
           // Pull Records from database
           const res = await fetch(`/api/get-data/pay-supplier-many?status=${status}`);
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


    // function setActionType(value:string) {
    //     alert(value);
    // }





    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const nativeSubmitEvent = event.nativeEvent as SubmitEvent;
          const submitter = nativeSubmitEvent.submitter as HTMLButtonElement | null;
          const nextAction = submitter?.value || actionType;

          const pidMessage = 'MSG' + new Date().getTime().toString();
          const currentStatus = status;

          const formData = new FormData(event.currentTarget);
          const submittedPidOrder = String(formData.get('pidOrder') || '');
          const submittedPidUser = String(formData.get('pidUser') || '');
          formData.set('currentStatus', currentStatus);
          formData.set('newStatus', nextAction);
          formData.set('message', message);
          formData.set('pidMessage', pidMessage);
          formData.set('status', status);
    // 
          //MAKE REQUEST ATTEMPT
          try {
            toast.info('Processing . . .' + submittedPidOrder + submittedPidUser);
            //MAKE REQUEST
            const res = await fetch('/api/status-processing/pay-supplier', {
              method: 'POST',
              body: formData,
            });
      
            // GET & PROCESS RESPONSE FROM API
            const data:any = await res.json();
      
            if (data.statusx == 'SUCCESS'){navigateWithAlert('/dashboard/pay-supplier?status=paid-supplier', 'success', 'Payment details was successfully confirmed and marked paid.');}
            // if (data.responsex.status == 'SUCCESS') {
            //   toast.success(data.responsex.message);
            // }
            if (data.statusx  == 'ACTION_FAILED') {
              toast.warning(data.message);
            }
            if (data.statusx  == 'SUCCESS_MESSAGE') {
              toast.success(data.message);
            }
            if (data.statusx  == 'CANCELLED'){navigateWithAlert('/dashboard/pay-supplier?status=request-cancelled', 'success', 'Pay Supplier Order has been successfully cancelled.');}
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
      <div className="py-24 text-center border-2 border-dashed border-border rounded-xl bg-muted/5 mx-2">
        <Package className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground italic">
          No {formatStatusLabel(status)} records found
        </p>
      </div>
    ); 
  }




    return (

                <div className="space-y-4">
                <div className="flex items-center gap-3 px-1 mb-6">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <Layers className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">
                            Supplier Queue: {formatStatusLabel(status)}
                        </h2>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                            Current Volume: {orderALL.length} Entries
                        </p>
                    </div>
                </div>
                    
                {
                    orderALL.map(
                        (datax: any, index: number) => {
                        const itemKey = `${index + 1}`;
                        const isActive = active === itemKey;
                        return (
                        
                            <div
                                className="bg-card border border-border shadow-soft rounded-lg overflow-hidden transition-all duration-200"
                                key={datax.pidPaySupplier || index}
                            >

                                    <button
                                        type="button"
                                        className={`w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset ${
                                            isActive ? 'bg-muted/30' : 'hover:bg-muted/50'
                                        }`}
                                        onClick={() => togglePara(itemKey)}
                                    >
                                        <div className="flex flex-col gap-1 mb-3 sm:mb-0">
                                            <span className={`text-base font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                                                #{index + 1} : {datax.supplierName}
                                            </span>
                                            <span className="text-sm text-muted-foreground font-medium">
                                                Request ID: {datax.pidPaySupplier || 'N/A'}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6">
                                            <div className="flex flex-col sm:items-end text-xs text-muted-foreground">
                                                <span>Updated: {formatPaySupplierTime(datax.updatedAt || datax.createdAt)}</span>
                                                <span>Created: {formatPaySupplierTime(datax.createdAt)}</span>
                                            </div>
                                            <div className={`text-muted-foreground transition-transform duration-300 ${isActive ? 'rotate-180 text-primary' : ''}`}>
                                                <CornerRightDown className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </button>
                                    <div>
                                        <AnimateHeight duration={300} height={isActive ? 'auto' : 0}>
                                            <div className="border-t border-border p-4 sm:p-6 bg-background/50 space-y-6">
                                            <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
                                                <h4 className="text-sm font-bold text-foreground mb-4 pb-3 border-b border-border">
                                                    Supplier Details
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-y-6 gap-x-4 text-sm">
                                                <DetailItem label="Request ID" value={datax.pidPaySupplier || 'N/A'} />
                                                <DetailItem label="Supplier Name" value={datax.supplierName || 'N/A'} />
                                                <DetailItem label="Supplier Number" value={datax.supplierPhone || 'N/A'} />
                                                <DetailItem label="Supplier Email" value={datax.supplierEmail || 'N/A'} />
                                                <div className="sm:col-span-2 xl:col-span-4">
                                                    <DetailItem label="Supplier Bank Details" value={datax.supplierBankAccountDetails || 'N/A'} />
                                                </div>
                                                </div>
                                                <div className="grid gap-3 pt-5 mt-5 border-t border-border md:grid-cols-3">
                                                    <AttachmentCard
                                                        label="AliPay Account"
                                                        value={datax.aliPayAccountQRCodeImage}
                                                    />
                                                    <AttachmentCard
                                                        label="WeChat Account"
                                                        value={datax.weChatAccountQRCodeImage}
                                                    />
                                                    <AttachmentCard
                                                        label="Proforma Invoice"
                                                        value={datax.proformaInvoiceImage}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 mt-5 border-t border-border">
                                                <DetailItem label="Amount to pay in Yuan" value={`¥${((datax.amountToPayInYuan as number) / 1)
                                                      .toFixed(2)
                                                      .toString()
                                                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string}`} />
                                                <DetailItem label="Amount to pay in Naira" value={`₦${((datax.amountToPayInNaira as number) / 1)
                                                      .toFixed(2)
                                                      .toString()
                                                      .replace(/\B(?=(\d{3})+(?!\d))/g, ',') as string}`} />
                                                </div>
                                            </div>
                                            </div>





                                            <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg shadow-sm">


                                                  <input type='hidden' id='pidUser' name='pidUser' defaultValue={datax.pidUser} />
                                                  <input type='hidden' id='pidOrder' name='pidOrder' defaultValue={datax.pidPaySupplier} />


                                                    {/* Confirm Action */}
                                                    <div className="space-y-3 p-5">
                                                        <p className="text-sm font-bold text-foreground">Confirm Action</p>
                                                        <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-md border border-border">
                                                            <input
                                                            key={index + 999999}
                                                            type="checkbox"
                                                            id={"confirm"+index}
                                                            className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                                                            required
                                                            />
                                                            <label htmlFor={"confirm"+index} className="text-sm font-medium text-foreground cursor-pointer">
                                                            Check this box to confirm your action
                                                            </label>
                                                        </div>
                                                    </div>



                                                    {/* Message to Buyer */}
                                                    <div className='p-5 pt-0'>
                                                        <textarea
                                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                                                            rows={3}
                                                            placeholder="Send Message to Buyer"
                                                            //value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                        ></textarea>
                                                    </div>



{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ SAVED ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'saved') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 pt-0"> 
            
            <div className="w-full md:w-1/1">
                <button type="submit" name="action" value="message" onClick={() => setActionType('message')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm">
                  Send Message
                </button>
                <small className="mt-2 block text-xs text-muted-foreground">Send message to Customer</small>
            </div>

        </div>
        </>
   )}








{/* ~~~~~~~~~~~~~~~~~~~~~~~~~~ PENDING PAYMENT - PAID SUPPLIER ~~~~~~~~~~~~~~~~~~~~~~~~~~ */}
{(status == 'pending-payment') && (
          <>
        {/* Action Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 pt-0">
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="request-cancelled" onClick={() => setActionType('request-cancelled')} className="w-full rounded-md bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 shadow-sm">
                  Cancel Request
                </button>
                <small className="mt-2 block text-xs text-muted-foreground">Cancel this request if there are issues</small>
            </div>
            
            <div className="w-full md:w-1/2">
                <button type="submit" name="action" value="paid-supplier" onClick={() => setActionType('paid-supplier')} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 px-4 rounded-md text-sm font-medium transition-colors shadow-sm">
                  Mark Paid
                </button>
                <small className="mt-2 block text-xs text-muted-foreground">Mark this supplier payment as paid</small>
            </div>
        </div>
        </>
   )}





                                                    </form>

                                        </AnimateHeight>
                                    </div>
                                </div>
                   
                        )
                    })
                }

                </div>
    );    
};

export default ComponentsAccordionsBasic;
