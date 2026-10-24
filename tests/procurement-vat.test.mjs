import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { destinationVatPercent } from '../lib/procurement/destinationVat.ts';

test('destination defaults, configurable rates, zero and invalid settings', () => {
  assert.equal(destinationVatPercent('United Kingdom', 7.5, undefined), 20);
  assert.equal(destinationVatPercent('Ghana', 7.5, '18'), 18);
  assert.equal(destinationVatPercent('NG', 7.5, 20), 7.5);
  assert.equal(destinationVatPercent('United States', 7.5, '0'), 0);
  assert.throws(() => destinationVatPercent('UK', 7.5, -1));
  assert.throws(() => destinationVatPercent('UK', 7.5, 101));
  assert.throws(() => destinationVatPercent('', 7.5, 20));
});
let country='United Kingdom', foreignVat='20';
let order={pidOrder:'test', status:'saved', destinationCountry:'country', currencyType:'USD', shippingPricingVersion:2, shippingRateSnapshot:10, shippingRateCurrency:'USD', shippingMeasurementUnit:'KG'};
globalThis.__vatDb={
  orders:{findUnique:async()=>order},
  products:{findMany:async()=>[{productPrice:100,productQuantity:1,shippingMeasurePerUnit:1}]},
  country:{findUnique:async()=>({countryName:country})},
  exchange_rate:{findUnique:async()=>({exNairaToDollar:1500,exYuanToDollar:7,exNairaToYuan:225,service_charge:15,vat:7.5})},
  $queryRaw:async()=>[{procurementVatForeign:foreignVat}],
};
const hook=registerHooks({resolve(s,c,n){
  if(s==='@/lib/prisma')return {url:'data:text/javascript,export const prisma=globalThis.__vatDb',shortCircuit:true};
  if(s.startsWith('.')&&!/\.(ts|mjs|js)$/.test(s))return n(new URL(s+'.ts',c.parentURL).href,c);
  return n(s,c);
}});
const {getProcurementOrderLifecycle}=await import('../lib/procurement/orderLifecycle.ts');
hook.deregister();
test('unpaid orders follow destination settings; paid orders preserve their saved VAT',async()=>{
  let result=await getProcurementOrderLifecycle('test');
  assert.equal(result.vatPercent,20);
  assert.equal(result.vatValueUsd,3); // 20% of the $15 service charge, not the $100 goods.
  foreignVat='25';
  assert.equal((await getProcurementOrderLifecycle('test')).vatValueUsd,3.75);
  order={...order,status:'on-hold'};
  country='Nigeria';
  assert.equal((await getProcurementOrderLifecycle('test')).vatPercent,7.5);
  country='United Kingdom';
  order={...order,status:'pending',vat:'12',serviceCharge:'15'};
  result=await getProcurementOrderLifecycle('test');
  assert.equal(result.vatPercent,12);
  assert.equal(result.vatValueUsd,1.7999999999999998);
});
