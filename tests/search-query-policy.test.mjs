import assert from 'node:assert/strict';
import test from 'node:test';

import { assessSupplierSearchQuery } from '../lib/intelligence/searchQueryPolicy.ts';

test('admin cannot launch research for vague market intent', () => {
  const assessment = assessSupplierSearchQuery('Supermarket target for my area');
  assert.notEqual(assessment.status, 'valid');
  assert.equal(assessment.canonicalQuery, null);
});

test('admin can launch research for a confirmed physical product', () => {
  const assessment = assessSupplierSearchQuery(
    'Commercial supermarket shelves',
  );
  assert.equal(assessment.status, 'valid');
  assert.equal(assessment.canonicalQuery, 'Commercial supermarket shelves');
});
