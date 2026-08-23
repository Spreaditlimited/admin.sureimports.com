import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterUniqueNewSuppliers,
  normalizeSupplierResearchCount,
  supplierMatchesExisting,
} from '../lib/intelligence/supplierResearchExpansion.ts';

test('supplier research count supports one and two while retaining the upper bound', () => {
  assert.equal(normalizeSupplierResearchCount(1), 1);
  assert.equal(normalizeSupplierResearchCount('2'), 2);
  assert.equal(normalizeSupplierResearchCount(0), 1);
  assert.equal(normalizeSupplierResearchCount(99), 10);
  assert.equal(normalizeSupplierResearchCount('invalid'), 3);
});

test('existing suppliers match by normalized company name or website domain', () => {
  const existing = [
    {
      supplierName: 'Guangzhou Example Garments Co., Ltd.',
      officialWebsite: 'https://www.example.cn/about-us',
    },
  ];

  assert.equal(
    supplierMatchesExisting(
      { supplierName: 'Guangzhou Example Garments Co Ltd' },
      existing,
    ),
    true,
  );
  assert.equal(
    supplierMatchesExisting(
      { officialWebsite: 'https://example.cn/contact' },
      existing,
    ),
    true,
  );
});

test('additional research keeps only new, unique supplier candidates', () => {
  const candidates = [
    { supplierName: 'Existing Factory', officialWebsite: 'https://existing.cn' },
    { supplierName: 'New Factory', officialWebsite: 'https://new.cn' },
    { supplierName: 'New Factory', officialWebsite: 'https://www.new.cn/contact' },
    { supplierName: 'Second Factory', officialWebsite: 'https://second.cn' },
  ];

  assert.deepEqual(
    filterUniqueNewSuppliers(candidates, [
      { supplierName: 'Existing Factory', officialWebsite: 'https://existing.cn' },
    ]).map((supplier) => supplier.supplierName),
    ['New Factory', 'Second Factory'],
  );
});
