import assert from 'node:assert/strict';
import test from 'node:test';

import {
  manualBankLedgerPaymentId,
  manualBankOutcomeForTransition,
} from '../lib/procurement/manualBankPayment.ts';

test('initial procurement bank payment is confirmed only when moved to pending', () => {
  assert.equal(manualBankOutcomeForTransition('bank-pending-saved-orders', 'pending'), 'CONFIRMED');
  assert.equal(manualBankOutcomeForTransition('bank-pending-saved-orders', 'saved'), 'REJECTED');
  assert.equal(manualBankOutcomeForTransition('bank-pending-saved-orders', 'approved'), null);
});

test('shipping bank payment is confirmed only when moved to in-transit', () => {
  assert.equal(manualBankOutcomeForTransition('bank-pending-shipping-orders', 'in-transit'), 'CONFIRMED');
  assert.equal(manualBankOutcomeForTransition('bank-pending-shipping-orders', 'pay-for-shipping'), 'REJECTED');
});

test('ledger payment ID is deterministic for idempotent confirmation', () => {
  assert.equal(manualBankLedgerPaymentId('BANK1788788829715'), 'PAYBANK1788788829715');
  assert.equal(manualBankLedgerPaymentId('BANK/unsafe value'), 'PAYBANKunsafevalue');
});
