import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createHmac } from 'node:crypto';
import { walletTotals, walletAmount, transferState } from '../lib/partners/wallet-policy.ts';

process.env.AFFILIATE_SECURITY_KEY=Buffer.alloc(32,17).toString('base64');
process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY='sk_live_synthetic_never_sent';
let state, queue=Promise.resolve(), provider={}, sent=[], uncertain=false;
function reset(){state={account:{bankCiphertext:null},credits:[],withdrawals:[],events:[],business:{ownerPidUser:'owner',status:'ACTIVE',country:'NG',settlementCurrency:'NGN',kycStatus:'VERIFIED'},order:{partnerId:'business',customerPidUser:'customer',ownerPidUser:'owner',slug:'shop',paymentStatus:'PAID',operationalStatus:'completed'}};provider={};sent=[];uncertain=false;}
const db={
 async $queryRaw(strings,...v){const q=strings.join('?');
  if(q.includes('procurement_partner_customer_orders'))return[state.order];
  if(q.includes('FROM procurement_partners'))return[state.business];
  if(q.includes('FROM partner_wallet_accounts'))return[state.account];
  if(q.includes('FROM partner_wallet_credits'))return q.includes('WHERE orderId=')?state.credits.filter(c=>c.orderId===v[0]):state.credits;
  if(q.includes('FROM partner_wallet_withdrawals'))return q.includes('WHERE id=')?state.withdrawals.filter(w=>w.id===v[0]):q.includes('retryKey=')?state.withdrawals.filter(w=>w.partnerId===v[0]&&w.retryKey===v[1]):state.withdrawals;
  throw new Error(q);
 },
 async $executeRaw(strings,...v){const q=strings.join('?');
  if(q.startsWith('INSERT INTO partner_wallet_accounts'))return 1;
  if(q.startsWith('INSERT INTO procurement_partner_kyc_events'))return 1;
  if(q.startsWith('INSERT INTO partner_wallet_events')){state.events.push({id:v[0],action:v[4]});return 1;}
  if(q.startsWith('INSERT INTO partner_wallet_credits')){state.credits.push({orderId:v[0],partnerId:v[1],amountMinor:v[2],state:'PENDING',deliveryConfirmedAt:null});return 1;}
  if(q.startsWith('UPDATE partner_wallet_accounts')){state.account.bankCiphertext=v[0];return 1;}
  if(q.startsWith('UPDATE partner_wallet_credits')){const c=state.credits.find(c=>c.orderId===v.at(-1));if(q.includes("state='AVAILABLE'")){c.state='AVAILABLE';c.deliveryConfirmedAt=new Date();c.deliveryMode=v[0];}else c.state=v[0];return 1;}
  if(q.startsWith('INSERT INTO partner_wallet_withdrawals')){state.withdrawals.push({id:v[0],partnerId:v[1],retryKey:v[2],amountMinor:v[3],destinationCiphertext:v[4],status:'REQUESTED',transferCode:null,failureCode:null,processingAt:null});return 1;}
  if(q.startsWith('UPDATE partner_wallet_withdrawals')){
   const w=state.withdrawals.find(w=>w.id===v[q.includes("status='CANCELLED'")?0:v.length-1]);
   if(q.includes("status='CANCELLED'")){if(!w||w.status!=='REQUESTED')return 0;w.status='CANCELLED';}
   else if(q.includes("SET status='PROCESSING'")){w.status='PROCESSING';w.processingAt=new Date();w.failureCode=null;}
   else if(q.includes('SET status=?')){w.status=v[0];w.transferCode=v[1];w.failureCode=null;}
   else if(q.includes("failureCode='PROVIDER_UNCERTAIN'")){if(w.status==='PROCESSING')w.failureCode='PROVIDER_UNCERTAIN';}
   else if(q.includes('SET transferCode='))w.transferCode=v[0];else throw new Error(q);return 1;
  }
  throw new Error(q);
 },
 $transaction(fn){const run=queue.then(async()=>{const before=structuredClone(state);try{return await fn(db);}catch(e){state=before;throw e;}});queue=run.catch(()=>{});return run;}
};
globalThis.__walletDb=db;
const hook=registerHooks({resolve(s,c,n){if(s==='server-only')return{url:'data:text/javascript,export{}',shortCircuit:true};if(s==='@/lib/prisma')return{url:'data:text/javascript,export const prisma=globalThis.__walletDb',shortCircuit:true};if(s.startsWith('.')&&!s.endsWith('.ts'))return n(new URL(s+'.ts',c.parentURL).href,c);return n(s,c);}});
const wallet=await import('../lib/partners/wallet.ts');hook.deregister();
globalThis.fetch=async(url,options)=>{
 const path=new URL(url).pathname;
 if(path==='/bank')return Response.json({status:true,data:[{code:'001',name:'Fixture Bank'},{code:'001',name:'Fixture Bank'}]});
 if(path==='/bank/resolve')return Response.json({status:true,data:{account_number:'0123456789',account_name:'Fixture Business'}});
 if(path==='/transferrecipient')return Response.json({status:true,data:{recipient_code:'RCP_fixture',active:true,currency:'NGN',details:{account_number:'0123456789',bank_code:'001'}}});
 if(path==='/transfer'){const body=JSON.parse(options.body);sent.push(body);provider[body.reference]={...body,status:'pending',recipient:{recipient_code:body.recipient},domain:'live',transfer_code:'TRF_fixture'};if(uncertain)throw new Error('Synthetic network uncertainty');return Response.json({status:true,data:provider[body.reference]});}
 if(path==='/transfer/finalize_transfer'){Object.values(provider).forEach(p=>p.status='success');return Response.json({status:true,data:{}});}
 if(path.startsWith('/transfer/verify/')){const ref=path.split('/').at(-1);return Response.json({status:Boolean(provider[ref]),data:provider[ref]}, {status:provider[ref]?200:404});}
 throw new Error('Unexpected provider call '+url);
};
const totals=()=>walletTotals(state.credits,state.withdrawals);
async function available(amount=100000){await wallet.creditWallet(db,'business','order',amount);await wallet.confirmCustomerReceipt('shop','customer','order','DELIVERED');await wallet.saveWalletBank('business','owner','001','0123456789');}

test('integer accounting: pending, held, reserved, paid, reversals and adjustment debt',()=>{
 assert.equal(walletAmount('1200'),1200n);for(const value of[0,-1,'1.2','1e3','01','',Number.MAX_SAFE_INTEGER+1])assert.throws(()=>walletAmount(value));
 assert.deepEqual(walletTotals([{state:'PENDING',amountMinor:20n},{state:'HELD',amountMinor:30n},{state:'AVAILABLE',amountMinor:100n}],[{status:'REQUESTED',amountMinor:10n},{status:'PAID',amountMinor:40n}]),{pending:'20',held:'30',available:'50',adjustmentDue:'0',reserved:'10',paid:'40'});
 assert.equal(walletTotals([],[{status:'PAID',amountMinor:100n}]).adjustmentDue,'100');
 for(const status of['pending','received','unknown'])assert.equal(transferState(status),'PROCESSING');assert.equal(transferState('success'),'PAID');assert.equal(transferState('otp'),'OTP_REQUIRED');
});
test('payment creates pending once; only the correct customer can release after fulfilment',async()=>{
 reset();await wallet.creditWallet(db,'business','order',100000);await wallet.creditWallet(db,'business','order',100000);assert.equal(state.credits.length,1);assert.equal(totals().available,'0');
 await assert.rejects(wallet.creditWallet(db,'business','order',100001),/reconciliation/);
 for(const actor of['owner','another-customer'])await assert.rejects(wallet.confirmCustomerReceipt('shop',actor,'order','DELIVERED'),{status:404});
 await assert.rejects(wallet.confirmCustomerReceipt('other-shop','customer','order','DELIVERED'),{status:404});
 state.order.operationalStatus='shipped';await assert.rejects(wallet.confirmCustomerReceipt('shop','customer','order','DELIVERED'),{status:409});state.order.operationalStatus='completed';
 assert.equal(totals().pending,'100000');await wallet.confirmCustomerReceipt('shop','customer','order','PICKED_UP');await wallet.confirmCustomerReceipt('shop','customer','order','PICKED_UP');assert.equal(totals().available,'100000');assert.equal(state.events.filter(e=>e.action==='CUSTOMER_RECEIPT_CONFIRMED').length,1);
});
test('withdrawals reserve atomically, deduplicate retries, freeze bank and reject overspending',async()=>{
 reset();await available();const key='same-request-key-123';const [a,b]=await Promise.all([wallet.requestWalletWithdrawal('business','owner','80000',key),wallet.requestWalletWithdrawal('business','owner','80000',key)]);assert.equal(a.id,b.id);assert.equal(state.withdrawals.length,1);assert.equal(totals().available,'20000');
 await assert.rejects(wallet.requestWalletWithdrawal('business','owner','30000','different-request-123'),/exceeds/);await assert.rejects(wallet.requestWalletWithdrawal('business','owner','70000',key),/another amount/);
 await assert.rejects(wallet.requestWalletWithdrawal('business','other','1','different-request-123'),{status:404});
 assert.ok(state.withdrawals[0].destinationCiphertext);await wallet.cancelWalletWithdrawal('business','owner',a.id);assert.equal(totals().available,'100000');await assert.rejects(wallet.executeWalletTransfer(a.id,'admin'),/not been sent/);
});
test('initiation is not payment; provider verification, signed webhooks and reversal are idempotent',async()=>{
 reset();await available();const {id}=await wallet.requestWalletWithdrawal('business','owner','90000','request-key-payment');await wallet.executeWalletTransfer(id,'admin');assert.equal(totals().reserved,'90000');assert.equal(totals().paid,'0');assert.equal(sent.length,1);
 await wallet.executeWalletTransfer(id,'admin');assert.equal(sent.length,1);
 provider[id].status='success';provider[id].amount=1;await assert.rejects(wallet.reconcileWalletTransfer(id),/do not match/);provider[id].amount=90000;
 const raw=JSON.stringify({event:'transfer.success',data:{reference:id}}),signature=createHmac('sha512',process.env.NEXT_SECRET_PAYSTACK_SECRET_KEY).update(raw).digest('hex');
 await assert.rejects(wallet.walletTransferWebhook(raw,'bad'),{status:401});await wallet.walletTransferWebhook(raw,signature);await wallet.walletTransferWebhook(raw,signature);assert.equal(totals().paid,'90000');assert.equal(state.events.filter(e=>e.action==='TRANSFER_PAID').length,1);
 provider[id].status='pending';await wallet.reconcileWalletTransfer(id);assert.equal(totals().paid,'90000');
 provider[id].status='reversed';await wallet.reconcileWalletTransfer(id);assert.equal(totals().available,'100000');assert.equal(totals().paid,'0');
});
test('uncertain transfers remain reserved; retry uses identical reference; holds block payouts',async()=>{
 reset();await available();const {id}=await wallet.requestWalletWithdrawal('business','owner','100000','request-key-uncertain');uncertain=true;await assert.rejects(wallet.executeWalletTransfer(id,'admin'),/uncertainty/);assert.equal(totals().reserved,'100000');assert.equal(state.withdrawals[0].failureCode,'PROVIDER_UNCERTAIN');
 state.withdrawals[0].processingAt=new Date(Date.now()-130000);uncertain=false;await wallet.executeWalletTransfer(id,'admin');assert.equal(sent.length,2);assert.equal(sent[0].reference,sent[1].reference);
 provider[id].status='otp';await wallet.reconcileWalletTransfer(id);await wallet.holdWalletCredit(db,'business','order',false,'PAYSTACK');await assert.rejects(wallet.executeWalletTransfer(id,'admin','123456'),/held earnings/);
 await wallet.reviewWalletCredit('order','admin','RELEASE','Provider dispute resolved with verified evidence.');await wallet.executeWalletTransfer(id,'admin','123456');assert.equal(totals().paid,'100000');
 await wallet.holdWalletCredit(db,'business','order',true,'PAYSTACK');assert.equal(totals().adjustmentDue,'100000');await assert.rejects(wallet.requestWalletWithdrawal('business','owner','1','new-withdrawal-key'),/exceeds/);
});
test('clearing a pre-delivery hold returns earnings to pending, never makes them withdrawable',async()=>{
 reset();await wallet.creditWallet(db,'business','order',100000);await wallet.holdWalletCredit(db,'business','order',false,'PAYSTACK');await wallet.reviewWalletCredit('order','admin','RELEASE','The dispute was resolved; customer receipt is still pending.');assert.equal(totals().available,'0');assert.equal(totals().pending,'100000');
 await wallet.confirmCustomerReceipt('shop','customer','order','DELIVERED');assert.equal(totals().available,'100000');
});
