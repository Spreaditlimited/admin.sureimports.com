import test from 'node:test';
import assert from 'node:assert/strict';
import { activationSchema } from '../lib/partners/activation-policy.ts';
test('test receipts cannot be used as signed live agreement references',()=>{
  for(const agreementReference of ['TEST-abc123','test-abc123',' TEST-abc123 ']) assert.equal(activationSchema.safeParse({revision:1,agreementReference,agreementReviewed:true}).success,false);
  assert.equal(activationSchema.safeParse({revision:1,agreementReference:'AGR-12345678-1234-1234-1234-123456789abc',agreementReviewed:true}).success,true);
});
