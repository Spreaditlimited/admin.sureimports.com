import { prisma } from '@/lib/prisma';

type PaidRefund = { id:string; pidUser:string|null; pidOrder:string|null; amount:string; currency:string; method:string; reference:string|null; paidAt:Date; userFirstname:string|null; userLastname:string|null; userEmail:string|null; userPhone:string|null };
export function refundLedgerRow(row:PaidRefund) {
  return {id:`refund:${row.id}`,source:'refunds' as const,status:'COMPLETED' as const,direction:'OUT' as const,amount:-Math.abs(Number(row.amount)),currency:row.currency || 'UNSPECIFIED',paymentMethod:row.method || 'LEGACY REFUND',reference:row.reference || row.id,serviceName:`Refund paid${row.pidOrder ? ` · ${row.pidOrder}` : ''}`,serviceType:'REFUND' as const,links:[{label:'Refund',href:`/dashboard/refunds?search=${encodeURIComponent(row.id)}`}],customer:{pidUser:row.pidUser||'N/A',name:[row.userFirstname,row.userLastname].filter(Boolean).join(' ')||'Customer',email:row.userEmail||'N/A',phone:row.userPhone||'N/A'},createdAt:new Date(row.paidAt).toISOString()};
}
/** Read authoritative settlements directly, including historic payouts; no duplicate payment inserts. */
export async function paidRefundLedgerRows() {
  const [settled,legacy,partner] = await Promise.all([
    prisma.$queryRaw<PaidRefund[]>`SELECT s.refundId id,s.pidUser,r.pidOrder,s.settlementAmount amount,s.settlementCurrency currency,s.method,s.reference,COALESCE(s.settledAt,s.updatedAt,s.createdAt) paidAt,u.userFirstname,u.userLastname,u.userEmail,u.userPhone FROM refund_settlements s LEFT JOIN refund_records r ON r.pidRefund=s.refundId LEFT JOIN users u ON u.pidUser=s.pidUser WHERE s.status='SETTLED'`,
    prisma.$queryRaw<PaidRefund[]>`SELECT r.pidRefund id,r.pidUser,r.pidOrder,r.amount,r.currency,CASE WHEN r.refundStatus='wallet-transferred' THEN 'WALLET' ELSE 'LEGACY REFUND' END method,NULL reference,COALESCE(r.updatedAt,r.createdAt) paidAt,u.userFirstname,u.userLastname,u.userEmail,u.userPhone FROM refund_records r LEFT JOIN users u ON u.pidUser=r.pidUser WHERE r.refundStatus IN ('paid','refunded','wallet-transferred') AND NOT EXISTS (SELECT 1 FROM refund_settlements s WHERE s.refundId=r.pidRefund)`,
    prisma.$queryRaw<PaidRefund[]>`SELECT p.id,NULL pidUser,a.orderId pidOrder,p.amountMinor/100 amount,p.currency,p.provider method,p.providerReference reference,COALESCE(p.checkedAt,a.settledAt,p.createdAt) paidAt,NULL userFirstname,NULL userLastname,NULL userEmail,NULL userPhone FROM partner_adjustment_refunds p JOIN partner_order_adjustments a ON a.id=p.adjustmentId WHERE p.status='SETTLED'`,
  ]);
  return [...settled,...legacy].map(refundLedgerRow).concat(partner.map(row=>({...refundLedgerRow(row),id:`partner-refund:${row.id}`,serviceName:`Partner refund paid · ${row.pidOrder || row.id}`,links:[{label:'Partner requests',href:'/dashboard/partners/requests'}]})));
}
