import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
const require = createRequire(import.meta.url);
const customerRoute = new URL(
  "../../sureimports.com/app/api/crud/procurement-cancel-order/route.ts",
  import.meta.url,
);
function fixture(admin = false) {
  const state = { signedIn: true, quotes: [], cancellations: [] };
  const service = {
    CancellationError: class extends Error {},
    getCancellationQuote: async (...args) => {
      state.quotes.push(args);
      return { token: "quote", amounts: [] };
    },
    cancelProcurement: async (...args) => {
      state.cancellations.push(args);
      return { refundIds: ["R1"] };
    },
  };
  const imports = {
    "next/server": {
      NextResponse: { json: (data, options) => Response.json(data, options) },
    },
    "@/lib/procurement/cancellation": service,
    "@/app/api/_lib/adminAccess": {
      requireAdminServiceAccess: async () =>
        state.signedIn
          ? { ok: true, admin: { pidUser: "ADMIN" } }
          : { ok: false, response: Response.json({}, { status: 403 }) },
    },
    "@/lib/refunds/request-auth": {
      refundUser: async () => (state.signedIn ? "OWNER" : null),
      sameOriginMutation: (request) =>
        request.headers.get("origin") === new URL(request.url).origin &&
        request.headers.get("sec-fetch-site") !== "cross-site",
    },
    "@/lib/affiliate/commissions": { voidAffiliateConversions: async () => {} },
    "@/lib/affiliate/reversals": {
      reverseAffiliateConversions: async () => {},
    },
  };
  const source = readFileSync(
    admin
      ? new URL("../app/api/procurement/cancellation/route.ts", import.meta.url)
      : customerRoute,
    "utf8",
  );
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
  return { ...module.exports, state };
}
const request = (body, origin = "https://sureimports.test") =>
  new Request("https://sureimports.test/api/cancel", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("customer GET is a preview, uses authenticated owner and cannot waive the fee", async () => {
  const f = fixture();
  const response = await f.GET(
    new Request(
      "https://sureimports.test/api/cancel?pidOrder=ORDER&pidUser=OTHER&chargeFee=false",
    ),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(f.state.quotes[0], [
    "ORDER",
    { kind: "customer", pidUser: "OWNER" },
    true,
  ]);
  assert.equal(f.state.cancellations.length, 0);
});
test("customer POST requires session, same origin and explicit consent", async () => {
  const f = fixture();
  f.state.signedIn = false;
  assert.equal((await f.POST(request({ confirmed: true }))).status, 401);
  f.state.signedIn = true;
  assert.equal(
    (await f.POST(request({ confirmed: true }, "https://attacker.test")))
      .status,
    403,
  );
  assert.equal((await f.POST(request({ confirmed: false }))).status, 400);
  assert.equal(f.state.cancellations.length, 0);
});
test("customer POST cannot impersonate an admin or avoid the fee", async () => {
  const f = fixture();
  assert.equal(
    (
      await f.POST(
        request({
          pidOrder: "ORDER",
          pidUser: "OTHER",
          kind: "admin",
          chargeFee: false,
          confirmed: true,
          token: "quote",
        }),
      )
    ).status,
    200,
  );
  assert.deepEqual(f.state.cancellations[0], [
    "ORDER",
    { kind: "customer", pidUser: "OWNER" },
    true,
    "quote",
  ]);
});
test("admin cancellation requires permission and a boolean fee decision", async () => {
  const f = fixture(true);
  f.state.signedIn = false;
  assert.equal((await f.POST(request({ confirmed: true }))).status, 403);
  f.state.signedIn = true;
  assert.equal(
    (await f.POST(request({ confirmed: true, chargeFee: "false" }))).status,
    400,
  );
  assert.equal(
    (
      await f.POST(
        request({
          confirmed: true,
          chargeFee: false,
          pidOrder: "ORDER",
          token: "quote",
        }),
      )
    ).status,
    200,
  );
  assert.deepEqual(f.state.cancellations[0], [
    "ORDER",
    { kind: "admin", pidUser: "ADMIN" },
    false,
    "quote",
  ]);
});
