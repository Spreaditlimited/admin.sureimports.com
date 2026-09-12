import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { commercialTermsSchema, percentageToBps } from '../lib/partners/commercial-terms-policy.ts';
const fixture={partner:{id:'business',status:'ACTIVE',serviceChargeBps:1500,partnerShareBps:500,pricingRevision:1,liveCollectionEnabled:true},events:[],fail:false};
const db={
 $queryRaw:async(q)=>q.join('?').includes('FROM procurement_partners')?[structuredClone(fixture.partner)]:[{partnerId:'business'}],
 $executeRaw:async(q,...v)=>{if(q.join('?').startsWith('UPDATE procurement_partners')){Object.assign(fixture.partner,{serviceChargeBps:v[0],partnerShareBps:v[1],pricingRevision:fixture.partner.pricingRevision+1,liveCollectionEnabled:false})}else{if(fixture.fail)throw new Error('Audit unavailable');fixture.events.push({id:v[0],emailStatus:'QUEUED',detailsCiphertext:v[3]})}return 1;},
 procurement_partners:{findUnique:async()=>structuredClone(fixture.partner),update:async({data})=>{Object.assign(fixture.partner,{...data,pricingRevision:fixture.partner.pricingRevision+data.pricingRevision.increment})}},
 procurement_partner_kyc:{findUnique:async()=>({partnerId:'business'})},
 procurement_partner_kyc_events:{create:async({data})=>{if(fixture.fail)throw new Error('Audit unavailable');fixture.events.push(data)}},
 $transaction:async fn=>{const before=structuredClone(fixture);try{return await fn(db)}catch(e){Object.assign(fixture,before);throw e}},
};
globalThis.__commercialDb=db;
const inline=s=>({url:'data:text/javascript,'+encodeURIComponent(s),shortCircuit:true});
const hook=registerHooks({resolve(s,c,n){if(s==='server-only')return inline('export{}');if(s==='@/lib/prisma')return inline('export const prisma=globalThis.__commercialDb');if(s==='./kyc-crypto')return inline('export const encryptKyc=b=>b');if(s==='./review')return inline('export class ReviewError extends Error{constructor(message,status){super(message);this.status=status}}');if(s==='./commercial-terms-policy')return n(s+'.ts',c);return n(s,c)}});
const {saveCommercialTerms}=await import('../lib/partners/commercial-terms.ts');hook.deregister();
const input={pricingRevision:1,serviceChargeBps:1500,partnerShareBps:1000,reason:'Updated commercial arrangement',confirmed:true};
test('percentages are explicit product-cost basis points, with bounded precision and share validation',()=>{
 assert.equal(percentageToBps('10'),1000);assert.equal(percentageToBps('7.25'),725);
 for(const x of ['','-1','100.01','1e2','1.001','Infinity'])assert.equal(percentageToBps(x),null);
 assert.equal(commercialTermsSchema.safeParse(input).success,true);
 for(const patch of [{partnerShareBps:1501},{serviceChargeBps:-1},{partnerShareBps:1.5},{confirmed:false},{reason:''},{pricingRevision:-1},{sureImportsShareBps:500}])assert.equal(commercialTermsSchema.safeParse({...input,...patch}).success,false);
});
test('terms update is revision-locked, audited, pauses collection and never rewrites orders or earnings',async()=>{
 await assert.rejects(saveCommercialTerms('business','admin',{...input,pricingRevision:0}),{status:409});
 fixture.fail=true;await assert.rejects(saveCommercialTerms('business','admin',input),/Audit unavailable/);assert.equal(fixture.partner.partnerShareBps,500);assert.equal(fixture.partner.liveCollectionEnabled,true);fixture.fail=false;
 const result=await saveCommercialTerms('business','admin',input);assert.equal(result.changed,true);assert.equal(fixture.partner.status,'ACTIVE');assert.equal(fixture.partner.liveCollectionEnabled,false);assert.equal(fixture.partner.pricingRevision,2);assert.equal(fixture.partner.partnerShareBps,1000);
 assert.equal(fixture.events.length,1);assert.equal(fixture.events[0].emailStatus,'QUEUED');
 const evidence=JSON.parse(Buffer.from(fixture.events[0].detailsCiphertext,'base64').toString());assert.equal(evidence.before.partnerShareBps,500);assert.equal(evidence.after.partnerShareBps,1000);
 await assert.rejects(saveCommercialTerms('business','admin',input),{status:409});
 assert.equal((await saveCommercialTerms('business','admin',{...input,pricingRevision:2})).changed,false);assert.equal(fixture.events.length,1);
 fixture.partner.status='SUSPENDED';await assert.rejects(saveCommercialTerms('business','admin',{...input,pricingRevision:2}),{status:409});
});
