import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import * as rules from "../lib/vehicles/installments.ts";
import * as refunds from "../lib/vehicles/refunds.ts";
import * as policy from "../lib/vehicles/policy.ts";
const require = createRequire(import.meta.url);
function route(file, mocks) {
  const module = { exports: {} };
  vm.runInNewContext(
    ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    {
      module,
      exports: module.exports,
      require: (id) => mocks[id] || require(id),
      Date,
      Response,
    },
  );
  return (body) =>
    module.exports.POST(
      new Request(
        "https://admin.sureimports.com/api/vehicles/orders/order/plan",
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "content-type": "application/json" },
        },
      ),
      { params: Promise.resolve({ id: "order" }) },
    );
}
const http = {
  sameOrigin: () => {},
  inputText: (v) => {
    if (!v) throw new Error("Required");
    return String(v);
  },
};
function refund({
  status = "CANCELLATION_REQUESTED",
  pending = 0,
  admin = "finance-2",
  paid = "300.00",
  orderStatus = "QUOTED",
  verified = true,
  changedBank = false,
} = {}) {
  const writes = [],
    events = [];
  const invoice = { pidInvoice: "invoice", amountPaid: paid };
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async (strings, ...values) => {
      writes.push({ sql: strings.join("?"), values });
      return 1;
    },
    vehicle_orders: {
      findUniqueOrThrow: async () => ({
        id: "order",
        status: orderStatus,
        pidInvoice: "invoice",
      }),
      update: async (v) => writes.push(v),
    },
    invoices: {
      findUniqueOrThrow: async () => invoice,
      update: async (v) => writes.push(v),
    },
    invoice_payment_claims: { count: async () => pending },
    invoice_audit_logs: { create: async (v) => writes.push(v) },
  };
  const post = route("../app/api/vehicles/orders/[id]/plan/route.ts", {
    "@/lib/banking/profile": {
      verifiedProfileBank: async () => {
        if (!verified) throw new Error("Bank not verified");
        return {
          fingerprint: changedBank ? "changed" : "hash",
          display: "Verified profile bank",
        };
      },
    },
    "@/lib/vehicles/refunds": refunds,
    "@/lib/prisma": { prisma: { $transaction: async (fn) => fn(tx) } },
    "@/lib/vehicles/access": {
      vehicleAdmin: async () => (admin ? { pidUser: admin } : null),
    },
    "@/lib/vehicles/http": http,
    "@/lib/vehicles/plans": {
      getVehiclePlan: async () => ({
        status,
        refundProposedBy: "finance-1",
        refundMinor: "29850",
        refundGrossMinor: "30000",
        refundFeeMinor: "150",
        refundBankFingerprint: "hash",
        refundAccount: "Verified profile bank",
        cancellationRequestedAt: "2026-09-30T12:00:00Z",
        refundDueAt: "2026-10-09T22:59:59.999Z",
      }),
    },
    "@/lib/vehicles/installments": rules,
    "@/lib/vehicles/events": {
      vehicleEvent: async (...v) => events.push(v),
      vehicleId: () => "audit",
    },
  });
  return { post, writes, events };
}
test("refund proposal requires reconciliation and verified customer destination", async () => {
  for (const [opts, body] of [
    [{ pending: 1 }, { destinationVerified: true }],
    [{ verified: false }, { destinationVerified: true }],
    [{ orderStatus: "SUPPLIER_ORDERED" }, { destinationVerified: true }],
  ]) {
    const c = refund(opts);
    assert.equal(
      (
        await c.post({
          action: "propose_refund",
          reason: "Customer request",
          refundAccount: "Verified bank details",
          ...body,
        })
      ).status,
      400,
    );
    assert.equal(c.writes.length, 0);
  }
  const c = refund();
  assert.equal(
    (
      await c.post({
        action: "propose_refund",
        reason: "Customer request",
        refundAccount: "Verified bank details",
        destinationVerified: true,
      })
    ).status,
    200,
  );
  assert.match(c.writes[0].sql, /REFUND_PENDING/);
  assert.ok(c.writes[0].values.includes(30000));
  assert.ok(c.writes[0].values.includes(150));
  assert.ok(c.writes[0].values.includes(29850));
  assert.ok(c.writes[0].values.includes("Verified profile bank"));
  assert.ok(!c.writes[0].values.includes("Verified bank details"));
});
test("refund settlement requires a different finance reviewer and exact outgoing amount", async () => {
  for (const [opts, body] of [
    [{ admin: "finance-1" }, {}],
    [{ changedBank: true }, {}],
    [{ verified: false }, {}],
    [{}, { amount: "300.00" }],
    [{}, { amount: "299.99" }],
    [{}, { bankTransferConfirmed: false }],
  ]) {
    const c = refund({ status: "REFUND_PENDING", ...opts });
    assert.equal(
      (
        await c.post({
          action: "confirm_refund",
          amount: "298.50",
          reference: "OUTGOING-123",
          bankTransferConfirmed: true,
          ...body,
        })
      ).status,
      400,
    );
    assert.equal(c.writes.length, 0);
  }
  const c = refund({ status: "REFUND_PENDING" });
  assert.equal(
    (
      await c.post({
        action: "confirm_refund",
        amount: "298.50",
        reference: "OUTGOING-123",
        bankTransferConfirmed: true,
      })
    ).status,
    200,
  );
  assert.match(c.writes[0].sql, /REFUNDED/);
  assert.ok(c.events.some((e) => e[2] === "PLAN_REFUNDED"));
});
function quote({ enabled = true, planStatus = "REQUESTED" } = {}) {
  const invoices = [],
    writes = [];
  const variant = {
    id: "v",
    manufacturerRmb: 1000,
    lengthMm: 1000,
    widthMm: 1000,
    heightMm: 1000,
    priceConfirmed: true,
    specificationsConfirmed: true,
  };
  const tx = {
    $queryRaw: async () => [],
    $executeRaw: async (strings, ...values) => {
      writes.push({ sql: strings.join("?"), values });
      return 1;
    },
    vehicle_orders: {
      findUniqueOrThrow: async () => ({
        id: "order",
        status: "ENQUIRY",
        modelSlug: "model",
        variantId: "v",
        quantity: 1,
        pidUser: "customer",
        vehicleName: "Car",
        email: "a@example.com",
        customerName: "Customer",
        phone: "234",
      }),
      update: async () => {},
    },
    vehicle_models: { findUnique: async () => ({ variants: [variant] }) },
    invoices: { create: async (value) => invoices.push(value) },
  };
  const post = route("../app/api/vehicles/orders/[id]/route.ts", {
    "@/lib/prisma": { prisma: { $transaction: async (fn) => fn(tx) } },
    "@/lib/vehicles/access": {
      vehicleAdmin: async () => ({ pidUser: "finance" }),
    },
    "@/lib/vehicles/http": http,
    "@/lib/vehicles/data": {
      vehicleRates: async () => ({
        ngnPerRmb: 200,
        ngnPerCbm: 10000,
        markupPercent: 20,
      }),
    },
    "@/lib/vehicles/plans": {
      getVehiclePlan: async () => ({ status: planStatus }),
      getPlanSettings: async () => ({
        ...rules.DEFAULT_PLAN_SETTINGS,
        enabled,
      }),
    },
    "@/lib/vehicles/installments": rules,
    "@/lib/vehicles/policy": policy,
    "@/lib/vehicles/events": {
      vehicleEvent: async () => {},
      vehicleId: () => "id",
    },
  });
  return { post, invoices, writes };
}
test("quotation includes fee once and freezes deposit on landed cost before fee", async () => {
  const c = quote();
  const response = await c.post({
    action: "quote",
    eta: "8–12 weeks after full payment",
    validityHours: 24,
    notes: "Confirmed configuration",
    priceRiskConfirmed: "on",
  });
  assert.equal(response.status, 200);
  const i = c.invoices[0].data;
  assert.equal(i.dueAt, null);
  assert.equal(i.grandTotal, 262500);
  assert.equal(i.balanceDue, 262500);
  assert.equal(
    i.items.create.reduce((n, r) => n + r.lineTotal, 0),
    262500,
  );
  const terms = JSON.parse(c.writes[0].values[0]);
  assert.equal(terms.landedMinor, 25000000);
  assert.equal(terms.depositMinor, 7500000);
  assert.equal(terms.feeMinor, 1250000);
  assert.equal(terms.totalMinor, 26250000);
});
test("plan offers require eligibility and explicit fixed-price approval", async () => {
  for (const [opts, confirmed] of [
    [{ enabled: false }, "on"],
    [{}, undefined],
    [{ planStatus: "ACTIVE" }, "on"],
  ]) {
    const c = quote(opts);
    assert.equal(
      (
        await c.post({
          action: "quote",
          priceRiskConfirmed: confirmed,
          eta: "8 weeks",
          notes: "Confirmed",
        })
      ).status,
      400,
    );
    assert.equal(c.invoices.length, 0);
  }
});
function reversal({
  admin = "finance-2",
  planStatus = "PAYMENT_REVIEW",
  reviewStatus = "REQUESTED",
  paid = "300.00",
} = {}) {
  const writes = [],
    events = [];
  const tx = {
    $queryRaw: async (strings) => {
      const sql = strings.join("");
      if (sql.includes("FROM vehicle_bank_credits"))
        return [{ amountMinor: "30000" }];
      if (sql.includes("FROM vehicle_credit_reversals"))
        return [
          {
            status: reviewStatus,
            proposedBy: "finance-1",
            reason: "Bank reversal confirmed",
          },
        ];
      return [];
    },
    $executeRaw: async (strings, ...values) => {
      writes.push({ sql: strings.join("?"), values });
      return 1;
    },
    vehicle_orders: {
      findUniqueOrThrow: async () => ({
        id: "order",
        status: "ORDER_CONFIRMED",
        pidInvoice: "invoice",
        pidUser: "customer",
      }),
      update: async (v) => writes.push(v),
    },
    invoice_payment_claims: {
      findUniqueOrThrow: async () => ({
        pidInvoice: "invoice",
        status: "APPROVED",
        approvedInvoicePaymentPid: "payment",
      }),
    },
    invoices: {
      findUniqueOrThrow: async () => ({
        pidInvoice: "invoice",
        grandTotal: "1050.00",
        amountPaid: paid,
      }),
      update: async (v) => writes.push(v),
    },
    invoice_payments: { create: async (v) => writes.push(v) },
    payments: { updateMany: async (v) => writes.push(v) },
    invoice_audit_logs: { create: async (v) => writes.push(v) },
  };
  const post = route("../app/api/vehicles/orders/[id]/reversal/route.ts", {
    "@/lib/prisma": { prisma: { $transaction: async (fn) => fn(tx) } },
    "@/lib/vehicles/access": { vehicleAdmin: async () => ({ pidUser: admin }) },
    "@/lib/vehicles/http": http,
    "@/lib/vehicles/plans": {
      getVehiclePlan: async () => ({
        status: planStatus,
        terms: rules.planTerms(1000, {
          ...rules.DEFAULT_PLAN_SETTINGS,
          enabled: true,
        }),
        activatedAt: "2026-01-01T00:00:00Z",
      }),
    },
    "@/lib/vehicles/installments": rules,
    "@/lib/vehicles/events": {
      vehicleEvent: async (...v) => events.push(v),
      vehicleId: () => "new-id",
    },
  });
  return { post, writes, events };
}
test("a proposed bank reversal freezes further payment and fulfilment", async () => {
  const c = reversal({ planStatus: "ACTIVE" });
  assert.equal(
    (
      await c.post({
        action: "request",
        claimId: "claim",
        reason: "Bank reversed this credit",
      })
    ).status,
    200,
  );
  assert.ok(c.writes.some((w) => w.sql?.includes("status='PAYMENT_REVIEW'")));
});
test("bank reversal needs a second reviewer and cannot produce negative approved funds", async () => {
  for (const opts of [{ admin: "finance-1" }, { paid: "299.99" }]) {
    const c = reversal(opts);
    assert.equal(
      (
        await c.post({
          action: "confirm",
          claimId: "claim",
          reference: "BANK-REV-123",
          bankReversalConfirmed: true,
        })
      ).status,
      400,
    );
    assert.equal(c.writes.length, 0);
  }
});
test("confirmed reversal appends a negative ledger entry and restores the exact balance", async () => {
  const c = reversal();
  assert.equal(
    (
      await c.post({
        action: "confirm",
        claimId: "claim",
        reference: "BANK-REV-123",
        bankReversalConfirmed: true,
      })
    ).status,
    200,
  );
  assert.ok(c.writes.some((w) => w.data?.amount === "-300.00"));
  assert.ok(
    c.writes.some(
      (w) => w.data?.amountPaid === "0.00" && w.data?.balanceDue === "1050.00",
    ),
  );
  assert.ok(c.events.some((e) => e[2] === "PLAN_PAYMENT_REVERSED"));
  const retry = reversal({ reviewStatus: "CONFIRMED" });
  assert.equal(
    (
      await retry.post({
        action: "confirm",
        claimId: "claim",
        reference: "BANK-REV-123",
        bankReversalConfirmed: true,
      })
    ).status,
    200,
  );
  assert.equal(retry.writes.length, 0);
});
