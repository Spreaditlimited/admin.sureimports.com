import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
process.env.CRON_SECRET='synthetic-retention-secret';
const f={paymentCount:0,checkout:false,status:'saved',mails:[],archived:0,fail:false};
const order={pidOrder:'old-order',pidUser:'customer',status:'saved',createdAt:new Date('2026-01-01'),updatedAt:null,products:[{productName:'Original product'}]};
const db={orders:{findMany:async({where})=>{assert.deepEqual(where.status.in,['saved']);return [order]},updateMany:async({where,data})=>{assert.equal(where.status,'saved');if(f.status!=='saved')return{count:0};f.status=data.status;f.archived++;return{count:1}}},payments:{count:async()=>f.paymentCount},users:{findUnique:async()=>({userEmail:'test@example.test',userFirstname:'Test'})},$queryRaw:async(parts)=>{if(f.fail)throw Error('database unavailable');return parts.join('').includes('checkouts')?(f.checkout?[{reference:'checkout'}]:[]):[]},$transaction:async fn=>fn(db)};
globalThis.__retention={f,db};
const inline=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hook=registerHooks({resolve(s,c,n){
 if(s==='next/server')return inline('export const NextResponse=Response;export const NextRequest=Request');
 if(s==='@/lib/prisma')return inline('export const prisma=globalThis.__retention.db');
 if(s==='@/lib/email/xMail2')return inline('export default async v=>{if(globalThis.__retention.f.status!=="expired-saved")throw Error("notification before archive");globalThis.__retention.f.mails.push(v)}');
 if(s==='@/app/api/_lib/adminAccess')return inline('export const requireAdminServiceAccess=async()=>({ok:false,response:Response.json({},{status:401})})');
 return n(s,c);
}});
const {GET}=await import('../app/api/cron/cleanup-saved-orders/route.ts');hook.deregister();
const run=()=>GET(new Request('https://admin.test/api/cron/cleanup-saved-orders',{headers:{authorization:'Bearer synthetic-retention-secret'}}));
function reset(){Object.assign(f,{paymentCount:0,checkout:false,status:'saved',mails:[],archived:0,fail:false});}
test('expired unpaid drafts are archived with products retained; notification follows successful archive',async()=>{reset();const j=await(await run()).json();assert.equal(j.archivedCount,1);assert.equal(j.deletedCount,0);assert.equal(f.status,'expired-saved');assert.equal(f.mails.length,1);assert.equal(order.products.length,1);});
test('a local payment or an unresolved provider checkout prevents expiry',async()=>{for(const values of [{paymentCount:1},{checkout:true}]){reset();Object.assign(f,values);const j=await(await run()).json();assert.equal(j.archivedCount,0);assert.equal(f.status,'saved');assert.equal(f.mails.length,0);}});
test('payment completing after candidate selection cannot be archived from a stale status',async()=>{reset();f.status='pending';const j=await(await run()).json();assert.equal(j.archivedCount,0);assert.equal(f.status,'pending');assert.equal(f.mails.length,0);});
test('database/checkouts lookup failure leaves orders intact',async()=>{reset();f.fail=true;assert.equal((await run()).status,500);assert.equal(f.status,'saved');assert.equal(f.archived,0);});
test('cron rejects missing authorization',async()=>{reset();assert.equal((await GET(new Request('https://admin.test'))).status,401);assert.equal(f.archived,0);});
