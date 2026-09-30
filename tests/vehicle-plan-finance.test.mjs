import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as rules from "../lib/vehicles/installments.ts";
const require = createRequire(import.meta.url);
function load(file, mocks) {
  const module = { exports: {} };
  const compiled = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require: (id) => (id === "server-only" ? {} : mocks[id] || require(id)),
    Date,
    Response,
  });
  return module.exports;
}
function setup({
  duplicate = false,
  status = "ACCEPTED",
  accepted = "2026-01-01T00:00:00.000Z",
  expires = "2099-01-01",
  other = false,
} = {}) {
  const inserts = [],
    events = [],
    t = rules.planTerms(1000, {
      ...rules.DEFAULT_PLAN_SETTINGS,
      enabled: true,
    }),
    plan = { status, acceptedAt: accepted, expiresAt: expires, terms: t };
  const tx = {
    $queryRaw: async (strings) =>
      strings.join("").includes("invoice_bank_accounts")
        ? [{ bankName: "Bank", accountNumber: "1234567890" }]
        : duplicate
          ? [{ id: "existing" }]
          : [],
    $executeRaw: async (strings, ...values) => {
      inserts.push({ sql: strings.join("?"), values });
      return 1;
    },
    invoice_payments: { findFirst: async () => (other ? {} : null) },
  };
  const api = load("../lib/vehicles/planFinance.ts", {
    "./plans": { getVehiclePlan: async () => plan },
    "./installments": rules,
    "./events": {
      vehicleEvent: async (...args) => events.push(args),
      vehicleId: () => "BC-test",
    },
  });
  const input = {
    orderId: "order",
    claimId: "claim",
    bankId: "bank",
    claimedAmount: "300.00",
    adminId: "finance",
    verification: {
      bankCreditConfirmed: true,
      bankReference: "BANK-UNIQUE-123",
      receivedAmount: "300.00",
      creditedAt: "2026-01-02T00:00:00.000Z",
    },
  };
  return { tx, api, input, inserts, events };
}
test("proof approval requires independent actual-credit evidence", async () => {
  for (const patch of [
    { bankCreditConfirmed: false },
    { receivedAmount: "299.99" },
    { bankReference: "a" },
    { creditedAt: "2099-01-01" },
    { creditedAt: "invalid" },
  ]) {
    const c = setup();
    await assert.rejects(
      c.api.verifyVehicleCredit(c.tx, {
        ...c.input,
        verification: { ...c.input.verification, ...patch },
      }),
    );
    assert.equal(c.inserts.length, 0);
  }
});
test("duplicate bank credits and references cannot fund a second vehicle", async () => {
  for (const opts of [{ duplicate: true }, { other: true }]) {
    const c = setup(opts);
    await assert.rejects(c.api.verifyVehicleCredit(c.tx, c.input));
    assert.equal(c.inserts.length, 0);
  }
});
test("unaccepted, frozen and expired-deposit plans reject allocation", async () => {
  for (const opts of [
    { status: "OFFERED" },
    { expires: "2026-01-01T12:00:00.000Z" },
    { accepted: "2026-01-03T00:00:00.000Z" },
  ]) {
    const c = setup(opts);
    await assert.rejects(c.api.verifyVehicleCredit(c.tx, c.input));
    assert.equal(c.inserts.length, 0);
  }
});
test("verified bank amount and value date are persisted, not client proof time", async () => {
  const c = setup();
  const r = await c.api.verifyVehicleCredit(c.tx, c.input);
  assert.equal(r.creditedAt.toISOString(), c.input.verification.creditedAt);
  assert.equal(c.inserts.length, 1);
  assert.ok(c.inserts[0].values.includes(30000));
  assert.ok(c.inserts[0].values.includes("BANK-UNIQUE-123"));
});
test("paid plan cannot complete until the full fee-inclusive total is approved", async () => {
  const c = setup();
  c.tx.$queryRaw = async () => [
    { amountMinor: "30000", creditedAt: new Date("2026-01-02T00:00:00Z") },
  ];
  await c.api.applyPlanCredit(c.tx, "order", 30000, "finance");
  assert.equal(c.inserts[0].values[0], "ACTIVE");
  assert.ok(!c.events.some((args) => args[2] === "PLAN_COMPLETED"));
  await c.api.applyPlanCredit(c.tx, "order", 105000, "finance");
  assert.equal(
    c.inserts
      .filter((i) => i.sql.includes("UPDATE vehicle_payment_plans"))
      .at(-1).values[0],
    "COMPLETED",
  );
  await assert.rejects(c.api.applyPlanCredit(c.tx, "order", 105001, "finance"));
});

test("cancellation reconciles pending credits without reactivating procurement", async () => {
  const c = setup({ status: "CANCELLATION_REQUESTED" });
  await c.api.verifyVehicleCredit(c.tx, c.input);
  await c.api.applyPlanCredit(c.tx, "order", 105000, "finance");
  assert.equal(c.inserts.length, 1);
  assert.equal(c.events.length, 0);
});
