import assert from "node:assert/strict";
import test from "node:test";
import {
  canCancelProcurement,
  cancellationAmounts,
  POST_APPROVED_STAGES,
} from "../lib/procurement/cancellation-policy.ts";

test("customers can cancel only pending orders, never an order that previously passed Approved", () => {
  for (const status of [
    "saved",
    "approved",
    "on-hold",
    "cancelled",
    "merged",
    ...POST_APPROVED_STAGES,
  ])
    assert.equal(
      canCancelProcurement(status, "customer", false),
      false,
      status,
    );
  assert.equal(canCancelProcurement("pending", "customer", false), true);
  assert.equal(canCancelProcurement("pending", "customer", true), false);
});
test("admin can cancel up to Approved, including early On Hold, with permanent later-stage lock", () => {
  for (const status of ["pending", "approved", "on-hold"]) {
    assert.equal(canCancelProcurement(status, "admin", false), true);
    assert.equal(canCancelProcurement(status, "admin", true), false);
  }
  for (const status of [
    "saved",
    "cancelled",
    "merged",
    ...POST_APPROVED_STAGES,
  ])
    assert.equal(canCancelProcurement(status, "admin", false), false, status);
});
test("2 percent fee and waiver preserve every minor unit", () => {
  assert.deepEqual(cancellationAmounts(100000n, "2"), {
    feeMinor: 2000n,
    netMinor: 98000n,
  });
  assert.deepEqual(cancellationAmounts(100000n, "0"), {
    feeMinor: 0n,
    netMinor: 100000n,
  });
  assert.deepEqual(cancellationAmounts(10005n, "2.50"), {
    feeMinor: 250n,
    netMinor: 9755n,
  });
  assert.deepEqual(cancellationAmounts(25n, "2"), {
    feeMinor: 1n,
    netMinor: 24n,
  });
  for (const percentage of ["-1", "101", "1.234", "NaN", "Infinity", "1e2"])
    assert.throws(() => cancellationAmounts(100n, percentage));
  assert.throws(() => cancellationAmounts(0n, "2"));
});
