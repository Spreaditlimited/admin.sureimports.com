// Explicit rollback-only database check: never commits prices or exchange rates.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { lockShopRate, syncRmbShopPrices, updateStoreWithRmbPricing } from '../lib/shop/rmb-pricing.mjs';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const rolledBack = new Error('EXPECTED_ROLLBACK');
const id = `RMB_TEST_${randomUUID()}`;
try {
  try {
    await db.$transaction(async tx => {
      await lockShopRate(tx);
      await tx.store.create({ data: { pidProduct: id, productPrice: 336000, productVisibility: false } });
      await tx.store.create({ data: { pidProduct: id + '_fixed', productPrice: 12345, productVisibility: false } });
      await tx.$executeRaw`INSERT INTO store_rmb_pricing (pidProduct, supplierRmb, markupRmb, source) VALUES (${id}, 1100, 500, 'rollback-test')`;
      for (const rate of [220, 230, 200, 220]) {
        await tx.exchange_rate.update({ where: { id: 1 }, data: { exNairaToYuan: String(rate) } });
        await syncRmbShopPrices(tx, rate);
        assert.equal((await tx.store.findUnique({ where: { pidProduct: id } })).productPrice, 1600 * rate);
        assert.equal((await tx.store.findUnique({ where: { pidProduct: id + '_fixed' } })).productPrice, 12345);
      }
      await updateStoreWithRmbPricing(tx, id, { productPrice: 336000 }, { supplierRmb: 1200, markupRmb: 500 });
      assert.equal((await tx.store.findUnique({ where: { pidProduct: id } })).productPrice, 374000);
      throw rolledBack;
    }, { timeout: 30000 });
  } catch (error) { if (error !== rolledBack) throw error; }
  assert.equal(await db.store.count({ where: { pidProduct: { startsWith: id } } }), 0);
  console.log('Verified increases, decreases, no compounding, fixed-NGN isolation, RMB edits and full rollback.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { await db.$disconnect(); }
