// Run against the disposable socket-only database. Never reads application credentials.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
const require = createRequire(import.meta.url);
const db = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://root@localhost/cancellation_test?socket=/private/tmp/sureimports-cancellation/mysql.sock",
    },
  },
});
function load(path, imports = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", js)(
    (name) => imports[name] || require(name),
    module,
    module.exports,
  );
  return module.exports;
}
const money = load("../lib/refunds/money.ts");
const policy = load("../lib/procurement/cancellation-policy.ts");
const { getCancellationQuote, cancelProcurement } = load(
  "../lib/procurement/cancellation.ts",
  {
    "@/lib/prisma": { prisma: db },
    "@/lib/refunds/money": money,
    "./cancellation-policy": policy,
  },
);
const prefix = "CANCEL_TEST_" + randomUUID().slice(0, 8);
const actor = { kind: "customer", pidUser: prefix };
let passed = 0;
async function check(name, fn) {
  await fn();
  console.log("PASS:", name);
  passed++;
}
async function fixture(status = "pending", currency = "NGN", amount = 1000) {
  const pidOrder = prefix + randomUUID().slice(0, 8);
  await db.orders.create({
    data: { pidOrder, pidUser: prefix, status, exchangeRate1: "1500" },
  });
  await db.payments.create({
    data: {
      pidPayment: randomUUID(),
      pidUser: prefix,
      payerName: "Test",
      txID: randomUUID(),
      txRef: randomUUID(),
      paymentStatus: "PAID",
      paymentType: "WALLET",
      currency,
      amount,
      serviceID: pidOrder,
      serviceName: "PROCUREMENT",
    },
  });
  return pidOrder;
}
try {
  await db.$executeRaw`ALTER TABLE refund_records MODIFY COLUMN ext2 TEXT NULL`;
  await db.$executeRaw`INSERT INTO procurement_cancellation_settings (id,feePercent) VALUES (1,2.00) ON DUPLICATE KEY UPDATE feePercent=2.00`;
  await db.users.create({
    data: { pidUser: prefix, userEmail: prefix + "@example.invalid" },
  });
  await check(
    "customer cancellation credits 98%, logs fee and cancels atomically",
    async () => {
      const id = await fixture();
      const quote = await getCancellationQuote(id, actor, false);
      assert.equal(quote.feePercent, "2");
      assert.equal(quote.amounts[0].net, "980.00");
      const result = await cancelProcurement(id, actor, false, quote.token);
      const r = await db.refund_records.findUnique({
        where: { pidRefund: result.refundIds[0] },
      });
      assert.equal(r.amount, "980.00");
      assert.equal(r.refundStatus, "pending");
      assert.equal(JSON.parse(r.ext2).fee, "20.00");
      assert.equal(
        (await db.orders.findUnique({ where: { pidOrder: id } })).status,
        "cancelled",
      );
      assert.equal(
        await db.refund_events.count({
          where: { refundId: r.pidRefund, eventType: "CANCELLATION_CREDIT" },
        }),
        1,
      );
      assert.deepEqual(
        await cancelProcurement(id, actor, false, quote.token),
        result,
      );
    },
  );
  await check("simultaneous double submission credits once", async () => {
    const id = await fixture();
    const q = await getCancellationQuote(id, actor, true);
    const results = await Promise.allSettled([
      cancelProcurement(id, actor, true, q.token),
      cancelProcurement(id, actor, true, q.token),
    ]);
    assert.ok(results.some((r) => r.status === "fulfilled"));
    assert.equal(await db.refund_records.count({ where: { pidOrder: id } }), 1);
  });
  await check("admin waiver and optional fee at Approved", async () => {
    for (const fee of [false, true]) {
      const id = await fixture("approved", "USD", 100);
      const a = { kind: "admin", pidUser: "TEST_ADMIN" };
      const q = await getCancellationQuote(id, a, fee);
      await cancelProcurement(id, a, fee, q.token);
      assert.equal(
        (await db.refund_records.findFirst({ where: { pidOrder: id } })).amount,
        fee ? "98.00" : "100.00",
      );
    }
  });
  await check("ownership and post-Approved stages are enforced", async () => {
    const id = await fixture();
    await assert.rejects(
      getCancellationQuote(
        id,
        { kind: "customer", pidUser: "SOMEONE_ELSE" },
        true,
      ),
    );
    await db.$executeRaw`UPDATE orders SET status='on-hold',cancellationLockedAt=NOW(3) WHERE pidOrder=${id}`;
    await assert.rejects(
      getCancellationQuote(id, { kind: "admin", pidUser: "TEST_ADMIN" }, false),
    );
    assert.equal(await db.refund_records.count({ where: { pidOrder: id } }), 0);
  });
  await check(
    "changed fee invalidates confirmation without cancelling",
    async () => {
      const id = await fixture();
      const q = await getCancellationQuote(id, actor, true);
      await db.$executeRaw`UPDATE procurement_cancellation_settings SET feePercent=3 WHERE id=1`;
      await assert.rejects(cancelProcurement(id, actor, true, q.token));
      assert.equal(
        (await db.orders.findUnique({ where: { pidOrder: id } })).status,
        "pending",
      );
      await db.$executeRaw`UPDATE procurement_cancellation_settings SET feePercent=2 WHERE id=1`;
    },
  );
  await check("stage changing after preview prevents refund", async () => {
    const id = await fixture();
    const q = await getCancellationQuote(id, actor, true);
    await db.orders.update({
      where: { pidOrder: id },
      data: { status: "approved" },
    });
    await assert.rejects(cancelProcurement(id, actor, true, q.token));
    assert.equal(await db.refund_records.count({ where: { pidOrder: id } }), 0);
  });
  await check(
    "earlier refund principal and fee cannot be credited again",
    async () => {
      const id = await fixture("pending", "USD", 100);
      await db.refund_records.create({
        data: {
          pidRefund: randomUUID(),
          pidOrder: id,
          pidUser: prefix,
          serviceType: "PROCUREMENT",
          currency: "USD",
          amount: "19.50",
          refundStatus: "pending",
          ext1: "ORDER_ADJUSTMENT",
          ext2: JSON.stringify({ refundBeforeFeeUsd: 20 }),
        },
      });
      const q = await getCancellationQuote(id, actor, true);
      assert.deepEqual(q.amounts, [
        { currency: "USD", gross: "80.00", fee: "1.60", net: "78.40" },
      ]);
    },
  );
  await check("failed refund write rolls back order cancellation", async () => {
    const id = await fixture();
    const q = await getCancellationQuote(id, actor, true);
    const orig = db.$transaction.bind(db);
    const failing = {
      ...db,
      $transaction: (fn) =>
        orig((tx) =>
          fn(
            new Proxy(tx, {
              get(target, key) {
                if (key === "refund_records")
                  return {
                    ...target.refund_records,
                    create: async () => {
                      throw Error("simulated storage failure");
                    },
                  };
                return Reflect.get(target, key);
              },
            }),
          ),
        ),
    };
    const service = load("../lib/procurement/cancellation.ts", {
      "@/lib/prisma": { prisma: failing },
      "@/lib/refunds/money": money,
      "./cancellation-policy": policy,
    });
    await assert.rejects(service.cancelProcurement(id, actor, true, q.token));
    assert.equal(
      (await db.orders.findUnique({ where: { pidOrder: id } })).status,
      "pending",
    );
    assert.equal(await db.refund_records.count({ where: { pidOrder: id } }), 0);
  });
  await check(
    "historical NGN refund uses its frozen currency amount, never a changed FX rate",
    async () => {
      const id = await fixture("pending", "NGN", 1000);
      await db.refund_records.create({
        data: {
          pidRefund: randomUUID(),
          pidOrder: id,
          pidUser: prefix,
          serviceType: "PROCUREMENT",
          currency: "NGN",
          amount: "195.00",
          refundStatus: "pending",
          ext1: "ORDER_ADJUSTMENT",
          ext2: JSON.stringify({
            refundBeforeFeeUsd: 0.13333333,
            refundGrossAmount: "200.00",
            refundCurrency: "NGN",
          }),
        },
      });
      const q = await getCancellationQuote(id, actor, true);
      assert.deepEqual(q.amounts, [
        { currency: "NGN", gross: "800.00", fee: "16.00", net: "784.00" },
      ]);
    },
  );
  await check(
    "legacy NGN adjustment without an original currency snapshot requires review",
    async () => {
      const id = await fixture("pending", "NGN", 1000);
      await db.refund_records.create({
        data: {
          pidRefund: randomUUID(),
          pidOrder: id,
          pidUser: prefix,
          serviceType: "PROCUREMENT",
          currency: "NGN",
          amount: "195.00",
          refundStatus: "pending",
          ext1: "ORDER_ADJUSTMENT",
          ext2: JSON.stringify({ refundBeforeFeeUsd: 0.13333333 }),
        },
      });
      await assert.rejects(
        getCancellationQuote(id, actor, true),
        /earlier refund needs review/,
      );
    },
  );
  await check(
    "migration preserves late-stage history through On Hold and leaves early stages cancellable",
    async () => {
      const early = await fixture("approved");
      const late = await fixture("in-transit");
      const reverted = await fixture("on-hold");
      await db.messages.create({
        data: {
          pidMessage: randomUUID(),
          pidOrder: reverted,
          messageTitle: "Admin Message: PAY-FOR-SHIPPING",
        },
      });
      await db.$executeRaw`ALTER TABLE orders DROP COLUMN cancellationLockedAt`;
      await db.$executeRaw`DROP TABLE procurement_cancellation_settings`;
      const sql = readFileSync(
        new URL(
          "../prisma/migrations/20261016090000_procurement_cancellation/migration.sql",
          import.meta.url,
        ),
        "utf8",
      );
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await db.$executeRawUnsafe(statement);
      const rows =
        await db.$queryRaw`SELECT pidOrder,cancellationLockedAt FROM orders WHERE pidOrder IN (${early},${late},${reverted})`;
      assert.equal(
        rows.find((r) => r.pidOrder === early).cancellationLockedAt,
        null,
      );
      assert.ok(rows.find((r) => r.pidOrder === late).cancellationLockedAt);
      assert.ok(rows.find((r) => r.pidOrder === reverted).cancellationLockedAt);
    },
  );
  console.log(
    `${passed} database scenarios passed. Only disposable local data was used.`,
  );
} finally {
  await db.$disconnect();
}
