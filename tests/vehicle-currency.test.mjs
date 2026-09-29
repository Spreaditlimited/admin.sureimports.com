import test from "node:test";
import assert from "node:assert/strict";
import {
  priceVehicle,
  referenceVehiclePrice,
  canQuote,
} from "../lib/vehicles/policy.ts";
const rates = {
  ngnPerUsd: 1500,
  ngnPerRmb: 220,
  ngnPerCbm: 500000,
  markupPercent: 20,
};
const vehicle = {
  priceCurrency: "USD",
  manufacturerUsd: 10000,
  manufacturerRmb: 100000,
  lengthMm: 5000,
  widthMm: 2000,
  heightMm: 1500,
  priceConfirmed: true,
  specificationsConfirmed: true,
};
test("USD uses the USD rate and shared markup; shipping is not marked up", () => {
  const price = priceVehicle(vehicle, rates, 2);
  assert.equal(price.vehicleNgn, 36000000);
  assert.equal(price.shippingNgn, 15000000);
  assert.equal(price.totalNgn, 51000000);
  assert.equal(
    priceVehicle(vehicle, { ...rates, markupPercent: 0 }).vehicleNgn,
    15000000,
  );
  assert.equal(
    priceVehicle(vehicle, { ...rates, markupPercent: 12.5 }).vehicleNgn,
    16875000,
  );
  assert.equal(
    priceVehicle({ ...vehicle, priceCurrency: "RMB" }, rates).vehicleNgn,
    26400000,
  );
  assert.equal(
    priceVehicle({ ...vehicle, priceCurrency: undefined }, rates).vehicleNgn,
    26400000,
  );
  assert.equal(priceVehicle(vehicle, { ...rates, ngnPerUsd: undefined }), null);
  assert.equal(priceVehicle({ ...vehicle, priceCurrency: "EUR" }, rates), null);
});
test("reference ranges calculate both endpoints and can never become invoices", () => {
  const v = { ...vehicle, referenceOnly: true, manufacturerUsdMax: 20000 };
  assert.deepEqual(referenceVehiclePrice(v, rates), {
    minNgn: 18000000,
    maxNgn: 36000000,
    shippingNgn: 7500000,
    landedMinNgn: 25500000,
    landedMaxNgn: 43500000,
  });
  assert.equal(priceVehicle(v, rates), null);
  assert.equal(canQuote(v, rates), false);
  assert.equal(
    referenceVehiclePrice({ ...v, lengthMm: null }, rates).landedMinNgn,
    null,
  );
  assert.equal(
    referenceVehiclePrice(v, { ...rates, ngnPerCbm: 0 }).shippingNgn,
    null,
  );
  for (const bad of [null, 0, -1, NaN, Infinity, 9000])
    assert.equal(
      referenceVehiclePrice({ ...v, manufacturerUsdMax: bad }, rates),
      null,
    );
  assert.equal(referenceVehiclePrice(v, { ...rates, ngnPerUsd: 0 }), null);
  assert.equal(referenceVehiclePrice(v, { ...rates, markupPercent: -1 }), null);
  assert.equal(
    referenceVehiclePrice({ ...v, manufacturerUsdMax: 1e20 }, rates),
    null,
  );
  assert.equal(
    referenceVehiclePrice({ ...v, referenceOnly: false }, rates),
    null,
  );
  assert.equal(canQuote({ ...v, referenceOnly: false }, rates), true);
});

test("ten supplied BEVs have Cloudinary galleries and sourced reference dimensions", async () => {
  const { readFileSync } = await import("node:fs");
  const models = JSON.parse(
    readFileSync(
      new URL("../lib/vehicles/catalogue.json", import.meta.url),
      "utf8",
    ),
  );
  const usd = models.filter((m) =>
    m.variants.some((v) => v.priceCurrency === "USD"),
  );
  assert.equal(usd.length, 10);
  assert.equal(models.length, 20);
  for (const m of models) {
    assert.ok(new Set(m.images).size >= 5, m.slug);
    assert.ok(
      m.images.every((u) => u.startsWith("https://res.cloudinary.com/")),
      m.slug,
    );
  }
  for (const m of usd) {
    assert.equal(m.powertrain, "Electric");
    for (const v of m.variants) {
      assert.equal(v.referenceOnly, true);
      assert.equal(canQuote(v, rates), false);
      assert.ok(v.dimensionsSource.startsWith("https://"));
      assert.ok(referenceVehiclePrice(v, rates).landedMinNgn > 0);
    }
  }
});
