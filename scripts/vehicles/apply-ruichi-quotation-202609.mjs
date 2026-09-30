// Explicit, scoped quotation update. Dry-run by default; --apply backs up and updates atomically.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { canQuote, priceVehicle } from "../../lib/vehicles/policy.ts";
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(path.join(root, "package.json"));
require("@next/env").loadEnvConfig(root, true, { info() {}, error() {} });
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const read = (file) => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const catalogue = read("lib/vehicles/catalogue.json");
const audit = read("docs/vehicles/ruichi-quotation-202609.json");
const slugs = [...new Set(audit.variants.map((v) => v.slug))];
assert.equal(slugs.length, 10);
assert.equal(audit.variants.length, 54);
try {
  const rows = await db.vehicle_models.findMany({
    where: { slug: { in: slugs } },
  });
  assert.equal(
    rows.length,
    slugs.length,
    "Missing existing Ruichi models; refusing a partial update.",
  );
  const rate = await db.exchange_rate.findUniqueOrThrow({ where: { id: 1 } });
  const rates = {
    ngnPerRmb: Number(rate.exNairaToYuan),
    ngnPerUsd: Number(rate.exNairaToDollar),
    ngnPerCbm: Number(rate.quotationSeaRateNgnPerCbm),
    markupPercent: Number(rate.vehicleMarkupPercent ?? 20),
  };
  const plan = rows.map((current) => {
    const seed = catalogue.find((m) => m.slug === current.slug);
    const changes = audit.variants.filter((v) => v.slug === current.slug);
    const ids = new Set(changes.map((v) => v.variantId));
    const replacements = seed.variants.filter((v) => ids.has(v.id));
    assert.equal(replacements.length, changes.length);
    assert.equal(
      new Set(replacements.map((v) => v.id)).size,
      replacements.length,
    );
    for (const v of replacements) {
      const item = changes.find((a) => a.variantId === v.id);
      assert.equal(v.manufacturerUsd, item.usd1To10);
      assert.equal(v.priceCurrency, "USD");
      assert.equal(v.manufacturerRmb, null);
      assert.equal(v.referenceOnly, false);
      assert.ok(v.source.startsWith(audit.document));
      assert.ok(v.source.length <= 500, "Source exceeds admin field limit");
      assert.ok(canQuote(v, rates), `Cannot calculate ${current.slug}/${v.id}`);
      assert.ok(priceVehicle(v, rates)?.totalNgn > 0);
    }
    // Preserve any additional configurations created in admin, along with their ordering.
    const variants = current.variants.map(
      (v) => replacements.find((r) => r.id === v.id) || v,
    );
    for (const v of replacements)
      if (!variants.some((x) => x.id === v.id)) variants.push(v);
    return {
      current,
      variants,
      changed: JSON.stringify(variants) !== JSON.stringify(current.variants),
      firstLanded: priceVehicle(variants[0], rates)?.totalNgn,
    };
  });
  console.table(
    plan.map((p) => ({
      model: p.current.slug,
      configurations: p.variants.length,
      action: p.changed ? "update prices/specs" : "unchanged",
      firstConfigurationLandedNgn: p.firstLanded,
    })),
  );
  if (process.argv.includes("--apply")) {
    const changed = plan.filter((p) => p.changed);
    if (changed.length) {
      const backup = path.join(
        os.tmpdir(),
        `ruichi-before-quotation-${Date.now()}.json`,
      );
      writeFileSync(backup, JSON.stringify(rows, null, 2) + "\n", {
        mode: 0o600,
        flag: "wx",
      });
      console.log(`Backup: ${backup}`);
      await db.$transaction(
        async (tx) => {
          for (const p of changed) {
            const result = await tx.vehicle_models.updateMany({
              where: { slug: p.current.slug, updatedAt: p.current.updatedAt },
              data: { variants: p.variants },
            });
            if (result.count !== 1)
              throw new Error(
                `Concurrent edit to ${p.current.slug}; entire update rolled back.`,
              );
          }
        },
        { timeout: 30000 },
      );
    }
    const saved = await db.vehicle_models.findMany({
      where: { slug: { in: slugs } },
    });
    for (const p of plan) {
      const row = saved.find((m) => m.slug === p.current.slug);
      assert.deepEqual(row.variants, p.variants);
      for (const key of [
        "images",
        "youtubeUrls",
        "published",
        "name",
        "description",
        "category",
        "powertrain",
        "updatedBy",
      ])
        assert.deepEqual(row[key], p.current[key]);
    }
    console.log(
      "Verified all 10 models. Images, publication settings and admin metadata preserved. No orders, invoices, rates or other makes modified.",
    );
  } else
    console.log("Read-only plan. Use --apply to update the shared catalogue.");
} finally {
  await db.$disconnect();
}
