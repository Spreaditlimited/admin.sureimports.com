import test from 'node:test';
import assert from 'node:assert/strict';
import { shippingBillingUnit } from '../lib/shipping/measurement.ts';

test('Nigeria sea shipping uses CBM even when the legacy plan row says KG', () => {
  assert.equal(shippingBillingUnit('Nigeria', 'SEA_SHIPPING', 'KG'), 'CBM');
});

test('other routes preserve their configured billing unit', () => {
  assert.equal(shippingBillingUnit('Nigeria', 'EXPRESS_SHIPPING', 'KG'), 'KG');
  assert.equal(shippingBillingUnit('United Kingdom', 'SEA_SHIPPING', 'KG'), 'KG');
  assert.equal(shippingBillingUnit('Ghana', 'CUSTOM_PLAN', 'CBM'), 'CBM');
});
