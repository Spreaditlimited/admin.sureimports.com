import test from 'node:test';
import assert from 'node:assert/strict';
import { rmbPriceNgn, updateStoreWithRmbPricing, syncRmbShopPrices } from '../lib/shop/rmb-pricing.mjs';

test('approved RMB margins follow rate increases and decreases without compounding', () => {
  assert.equal(rmbPriceNgn(1100, 500, 210), 336000);
  assert.equal(rmbPriceNgn(1100, 500, 220), 352000);
  assert.equal(rmbPriceNgn(1100, 500, 200), 320000);
  assert.equal(rmbPriceNgn(5300, 800, 220), 1342000);
  assert.equal(rmbPriceNgn(10250, 800, 220), 2431000);
  assert.equal(rmbPriceNgn('1100.25', '500.50', '220.15'), 352405.11);
});
test('invalid source amounts and rates fail closed', () => {
  for (const rate of [null, '', 0, -1, NaN, Infinity, 'no rate']) assert.throws(() => rmbPriceNgn(1100, 500, rate));
  assert.throws(() => rmbPriceNgn(0, 500, 220));
  assert.throws(() => rmbPriceNgn(1100, -500, 220));
  assert.throws(() => rmbPriceNgn(1100.001, 500, 220));
});
test('editing a linked product ignores stale NGN input and keeps its latest RMB basis', async () => {
  let data;
  const tx = { $queryRaw: async (sql) => sql.join('').includes('exchange_rate') ? [{ exNairaToYuan: '220' }] : [{ supplierRmb: 1100, markupRmb: 500 }],
    store: { update: async (args) => { data = args.data; return data; } } };
  await updateStoreWithRmbPricing(tx, 'test', { productName: 'Updated', productPrice: 336000 });
  assert.deepEqual(data, { productName: 'Updated', productPrice: 352000 });
});
test('fixed NGN products retain their price; linked supplier edits use the current rate', async () => {
  const tx = { $queryRaw: async (sql) => sql.join('').includes('exchange_rate') ? [{ exNairaToYuan: '220' }] : [],
    store: { update: async ({ data }) => data } };
  assert.equal((await updateStoreWithRmbPricing(tx, 'test', { productPrice: 12345 })).productPrice, 12345);
  tx.$queryRaw = async sql => sql.join('').includes('exchange_rate') ? [{ exNairaToYuan: '220' }] : [{ supplierRmb: 1100, markupRmb: 500 }];
  tx.$executeRaw = async () => 1;
  assert.equal((await updateStoreWithRmbPricing(tx, 'test', { productPrice: 336000 }, { supplierRmb: 1200, markupRmb: 500 })).productPrice, 374000);
});
test('repricing validates every linked source before writing', async () => {
  let writes = 0;
  await assert.rejects(syncRmbShopPrices({ $queryRaw: async () => [{ supplierRmb: -10, markupRmb: 500 }], $executeRaw: async () => writes++ }, 220));
  assert.equal(writes, 0);
});
