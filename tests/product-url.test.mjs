import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeProductUrl } from '../lib/productUrl.ts';

test('extracts the product URL stored by Alibaba share messages', () => {
  assert.equal(
    normalizeProductUrl(
      '🛒 Found exactly what I needed on Alibaba — check out this product! 👉 https://www.alibaba.com/x/1lB5Wze?ck=pdp',
    ),
    'https://www.alibaba.com/x/1lB5Wze?ck=pdp',
  );
});

test('rejects invalid link text so admin does not render a broken anchor', () => {
  assert.equal(normalizeProductUrl('not a link'), null);
});
