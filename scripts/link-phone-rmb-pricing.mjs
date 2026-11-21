import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { lockShopRate, rmbPriceNgn, syncRmbShopPrices } from '../lib/shop/rmb-pricing.mjs';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const sourceDir = process.env.PHONE_PRICE_SOURCE_DIR || path.resolve('../sureimports.com/scripts/catalogue');
const iphone = JSON.parse(fs.readFileSync(path.join(sourceDir, 'iphone-prices-2026-09-22.json')));
const samsung = JSON.parse(fs.readFileSync(path.join(sourceDir, 'samsung-prices-2026-10-24.json')));
const entries = [
  ...iphone.refurbished.map(([model, gb, supplierRmb]) => ({
    name: `iPhone ${model} ${gb}GB — Refurbished`, supplierRmb,
    markupRmb: iphone.refurbishedMarkupRmb, oldRate: iphone.ngnPerRmb, source: 'iphone-2026-09-22',
  })),
  ...iphone.brandNew.map(([model, gb, supplierRmb, colour]) => ({
    name: `iPhone ${model} ${gb}GB${colour ? ' — ' + colour : ''} — Brand new`, supplierRmb,
    markupRmb: iphone.brandNewMarkupOverridesRmb?.[model] ?? iphone.brandNewMarkupRmb,
    oldRate: iphone.ngnPerRmb, source: 'iphone-2026-09-22',
  })),
  ...samsung.rows.map(([model, gb, sim, supplierRmb, markupRmb]) => ({
    name: `Samsung Galaxy ${model} ${gb}GB - ${sim === 'SIM unspecified' ? 'SIM configuration to be confirmed' : sim} - Refurbished`,
    supplierRmb, markupRmb, oldRate: samsung.ngnPerRmb, source: 'samsung-2026-10-24',
  })),
];
try {
  if (process.argv.includes('--install-schema')) {
    const sql = fs.readFileSync(new URL('../prisma/migrations/20261121090000_store_rmb_pricing/migration.sql', import.meta.url), 'utf8');
    await db.$executeRawUnsafe(sql);
    console.log('Installed private RMB pricing table.');
  }
  const all = await db.store.findMany({ orderBy: { id: 'asc' } });
  const rateRow = await db.exchange_rate.findUniqueOrThrow({ where: { id: 1 } });
  const rate = Number(rateRow.exNairaToYuan);
  const changes = entries.map((e) => {
    const matches = all.filter(r => r.productVisibility && r.productName === e.name);
    assert.equal(matches.length, 1, `Expected one visible listing: ${e.name}`);
    const before = matches[0];
    const oldPrice = rmbPriceNgn(e.supplierRmb, e.markupRmb, e.oldRate);
    const price = rmbPriceNgn(e.supplierRmb, e.markupRmb, rate);
    assert.ok([oldPrice, price].includes(before.productPrice), `Unexpected price; review ${e.name}`);
    return { ...e, before, price };
  });
  const targetIds = new Set(changes.map(c => c.before.pidProduct));
  const visiblePhones = all.filter(r => r.productVisibility && (/\biphone\b/i.test(r.productName || '') || /samsung/i.test(r.productBrand || '')));
  assert.deepEqual(new Set(visiblePhones.map(r => r.pidProduct)), targetIds, 'Unmatched visible phone listings');
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', rate, count: changes.length,
    examples: changes.filter((_, i) => [0, 55, 60].includes(i)).map(c => ({ name: c.name, before: c.before.productPrice, after: c.price })) }, null, 2));
  if (apply) {
    const backup = path.join(os.tmpdir(), `phone-pricing-before-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify({ changes, rate }, null, 2), { mode: 0o600 });
    await db.$transaction(async tx => {
      assert.equal(await lockShopRate(tx), rate, 'Exchange rate changed; rerun');
      const locked = await tx.$queryRaw`SELECT pidProduct FROM store ORDER BY id FOR UPDATE`;
      assert.equal(locked.length, all.length);
      assert.deepEqual(await tx.store.findMany({ orderBy: { id: 'asc' } }), all, 'Concurrent product changes; rerun');
      for (const c of changes) {
        const id = c.before.pidProduct;
        const existing = await tx.$queryRaw`SELECT supplierRmb, markupRmb FROM store_rmb_pricing WHERE pidProduct = ${id}`;
        if (existing.length) {
          assert.equal(Number(existing[0].supplierRmb), c.supplierRmb, 'Linked supplier amount changed');
          assert.equal(Number(existing[0].markupRmb), c.markupRmb, 'Linked markup changed');
        } else {
          await tx.$executeRaw`INSERT INTO store_rmb_pricing (pidProduct, supplierRmb, markupRmb, source) VALUES (${id}, ${c.supplierRmb}, ${c.markupRmb}, ${c.source})`;
        }
      }
      await syncRmbShopPrices(tx, rate);
      const after = await tx.store.findMany({ orderBy: { id: 'asc' } });
      assert.deepEqual(after.filter(r => !targetIds.has(r.pidProduct)), all.filter(r => !targetIds.has(r.pidProduct)));
      for (const c of changes) {
        const row = after.find(r => r.pidProduct === c.before.pidProduct);
        assert.equal(row.productPrice, c.price);
        assert.deepEqual({ ...row, productPrice: c.before.productPrice, updatedAt: c.before.updatedAt }, c.before);
      }
    }, { timeout: 60000 });
    console.log(JSON.stringify({ verified: true, linked: changes.length, backup }));
  }
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally { await db.$disconnect(); }
