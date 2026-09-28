import test from "node:test";
import assert from "node:assert/strict";
import { priceVehicle, validVehicleMarkup } from "../lib/vehicles/policy.ts";
const variant = {
  manufacturerRmb: 100000,
  lengthMm: 5000,
  widthMm: 2000,
  heightMm: 2000,
};
const rates = { ngnPerRmb: 220, ngnPerCbm: 500000 };
test("configurable markup supports zero, fractions and percentages over 100 without marking up shipping", () => {
  for (const [markupPercent, expected] of [
    [0, 44000000],
    [12.5, 49500000],
    [20, 52800000],
    [35, 59400000],
    [150, 110000000],
  ]) {
    const quote = priceVehicle(variant, { ...rates, markupPercent }, 2);
    assert.equal(quote.vehicleNgn, expected);
    assert.equal(quote.shippingNgn, 20000000);
    assert.equal(quote.totalNgn, quote.vehicleNgn + quote.shippingNgn);
  }
  assert.equal(priceVehicle(variant, rates).vehicleNgn, 26400000);
});
test("rejects invalid markup instead of publishing incorrect prices", () => {
  for (const value of [-1, NaN, Infinity, 0.001, 1e9, null, "", "20"])
    assert.equal(validVehicleMarkup(value), false);
  for (const markupPercent of [-1, NaN, Infinity, 0.001, 1e9])
    assert.equal(priceVehicle(variant, { ...rates, markupPercent }), null);
});
test("changing markup does not mutate previously calculated quotations", () => {
  const current = { ...rates, markupPercent: 20 };
  const quote = priceVehicle(variant, current);
  current.markupPercent = 35;
  assert.equal(quote.vehicleNgn, 26400000);
  assert.equal(priceVehicle(variant, current).vehicleNgn, 29700000);
});
