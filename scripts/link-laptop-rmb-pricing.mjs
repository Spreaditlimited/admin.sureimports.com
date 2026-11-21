import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { lockShopRate, rmbPriceNgn, reconstructLaptopSupplier } from '../lib/shop/rmb-pricing.mjs';
const require = createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const apply = process.argv.includes('--apply');
const planPath = process.argv.find(a => a.startsWith('--plan='))?.slice(7);
const laptop = p => ['laptop','laptops'].includes(String(p.productCategory).toLowerCase().trim()) || /macbook/i.test(p.productName || '');
try {
  if (apply && !planPath) throw new Error('Apply requires an explicitly reviewed --plan=/private/path.json');
  if (!apply) {
    const all = await db.store.findMany({ orderBy: { id: 'asc' } });
    const linked = await db.$queryRaw`SELECT pidProduct FROM store_rmb_pricing`;
    const linkedIds = new Set(linked.map(p => p.pidProduct));
    const rate = Number((await db.exchange_rate.findUniqueOrThrow({ where: { id: 1 } })).exNairaToYuan);
    const changes = all.filter(p => laptop(p) && !linkedIds.has(p.pidProduct)).map(before => {
      const supplierRmb = reconstructLaptopSupplier(before.productPrice);
      return { before, supplierRmb, markupRmb: 600, after: rmbPriceNgn(supplierRmb, 600, rate) };
    });
    const plan = { version: 1, formula: 'currentNGN / 210 - 600; RMB rounded half-up to 2dp', rate, changes };
    const dest = path.join(os.tmpdir(), `laptop-rmb-plan-${Date.now()}.json`);
    fs.writeFileSync(dest, JSON.stringify(plan, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(JSON.stringify({ mode: 'dry-run', count: changes.length, visible: changes.filter(c=>c.before.productVisibility).length, rate, plan: dest, examples: changes.slice(0,3).map(c=>({ name:c.before.productName, before:c.before.productPrice, supplierRmb:c.supplierRmb, markupRmb:600, after:c.after })) },null,2));
  } else {
    const plan = JSON.parse(fs.readFileSync(planPath));
    assert.equal(plan.version, 1);
    assert.ok(plan.changes.length > 0);
    assert.equal(new Set(plan.changes.map(c=>c.before.pidProduct)).size,plan.changes.length);
    // Keep the reviewed before records as a private rollback/audit artifact before writes.
    const backup = path.join(os.tmpdir(), `laptop-rmb-before-${Date.now()}.json`);
    fs.writeFileSync(backup, JSON.stringify(plan,null,2), {mode:0o600,flag:'wx'});
    await db.$transaction(async tx => {
      assert.equal(await lockShopRate(tx),plan.rate,'Rate changed; regenerate and review plan');
      for (const c of plan.changes) {
        assert.ok(laptop(c.before));
        assert.equal(c.markupRmb,600);
        assert.equal(c.supplierRmb,reconstructLaptopSupplier(c.before.productPrice));
        assert.equal(c.after,rmbPriceNgn(c.supplierRmb,600,plan.rate));
        const id=c.before.pidProduct;
        await tx.$queryRaw`SELECT pidProduct FROM store WHERE pidProduct=${id} FOR UPDATE`;
        const current=await tx.store.findUniqueOrThrow({where:{pidProduct:id}});
        assert.deepEqual(JSON.parse(JSON.stringify(current)),c.before,'Product changed; regenerate plan');
        const existing=await tx.$queryRaw`SELECT pidProduct FROM store_rmb_pricing WHERE pidProduct=${id} FOR UPDATE`;
        assert.equal(existing.length,0,'Already linked; never reconstruct from a repriced amount');
        await tx.$executeRaw`INSERT INTO store_rmb_pricing (pidProduct,supplierRmb,markupRmb,source) VALUES (${id},${c.supplierRmb},600,'owner-approved-laptop-ngn-div210-minus600')`;
        const after=await tx.store.update({where:{pidProduct:id},data:{productPrice:c.after,updatedAt:new Date()}});
        assert.equal(after.productPrice,c.after);
        assert.deepEqual({...after,productPrice:current.productPrice,updatedAt:current.updatedAt},current);
      }
    },{timeout:60000});
    console.log(JSON.stringify({applied:plan.changes.length,backup}));
  }
} catch(e) { console.error(e.message); process.exitCode=1; } finally { await db.$disconnect(); }
