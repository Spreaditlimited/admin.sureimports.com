import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const fixture={signedIn:true,admin:true,attempts:0,calls:[],db:{$transaction:fn=>fn(fixture.db),$queryRaw:async()=>[{total:fixture.attempts}],users:{findUnique:async()=>({userPassword:'fixture-hash'})}}};
globalThis.__walletRoutes=fixture;
const code=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hook=registerHooks({resolve(s,c,n){
 if(s==='bcryptjs')return code('export default {compare:async(value)=>value==="fixture-password"}');
 if(s==='@/lib/prisma')return code('export const prisma=globalThis.__walletRoutes.db');
 if(s==='@/lib/partners/review')return code('export const requirePartnerReviewer=async()=>globalThis.__walletRoutes.admin?{pidUser:"admin"}:null;export const reviewResponse=(body,status=200)=>Response.json(body,{status});');
 if(s==='@/lib/partners/kyc-server')return code(`export class KycError extends Error{constructor(message,status){super(message);this.status=status}};export const kycResponse=(body,status=200)=>Response.json(body,{status});export async function kycActor(request){if(request&&request.headers.get('origin')!==new URL(request.url).origin)throw new KycError('Invalid origin',403);if(!globalThis.__walletRoutes.signedIn)throw new KycError('Unauthorized',401);return {partnerId:'business',actorPid:'owner'}};export async function boundedBody(request,max){const b=Buffer.from(await request.text());if(b.length>max)throw new KycError('Too large',413);return b;}`);
 if(s==='@/lib/partners/wallet')return code(`export class WalletError extends Error{constructor(message,status=400){super(message);this.status=status}};const call=(action,...args)=>{globalThis.__walletRoutes.calls.push({action,args});return {}};export const lockWallet=async()=>{};export async function walletAudit(){globalThis.__walletRoutes.attempts++};export const walletView=async(...a)=>call('VIEW',...a);export const walletBanks=async()=>[];export const saveWalletBank=async(...a)=>call('BANK',...a);export const requestWalletWithdrawal=async(...a)=>call('WITHDRAW',...a);export const cancelWalletWithdrawal=async(...a)=>call('CANCEL',...a);export const executeWalletTransfer=async(...a)=>call('EXECUTE',...a);export const reconcileWalletTransfer=async(...a)=>call('RECONCILE',...a);export const reviewWalletCredit=async(...a)=>call('REVIEW',...a);`);
 return n(s,c);
}});
const admin=await import('../app/api/partners/wallet/route.ts');hook.deregister();
const post=(body,origin='https://partner.example.com')=>new Request('https://partner.example.com/api/partners/wallet',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('admin financial actions require reviewer authority, same origin and explicit review confirmation',async()=>{
 fixture.admin=false;assert.equal((await admin.GET(new Request('https://partner.example.com/api/partners/wallet'))).status,403);assert.equal((await admin.POST(post({action:'EXECUTE',id:'id'}))).status,403);fixture.admin=true;
 assert.equal((await admin.POST(post({action:'EXECUTE'},'https://evil.example'))).status,403);
 assert.equal((await admin.POST(post(null))).status,422);
 assert.equal((await admin.POST(post({action:'HOLD',id:'order',evidence:'reviewed'}))).status,422);
 assert.equal((await admin.POST(post({action:'HOLD',id:'order',evidence:'reviewed',confirmed:true}))).status,200);
 assert.deepEqual(fixture.calls.find(c=>c.action==='REVIEW').args,['order','admin','HOLD','reviewed']);
 assert.equal((await admin.POST(post({action:'EXECUTE',id:'withdrawal',otp:'123456'}))).status,422);
 assert.equal((await admin.POST(post({action:'EXECUTE',id:'withdrawal',otp:'123456',confirmed:true}))).status,200);
 assert.deepEqual(fixture.calls.find(c=>c.action==='EXECUTE').args,['withdrawal','admin','123456']);
});
