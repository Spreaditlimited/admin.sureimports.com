// Real confirmation UI; API responses are fixtures. No money or customer data is used.
import { createServer } from "node:http";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, mkdirSync } from "node:fs";
const require = createRequire(import.meta.url);
const { build } = require(process.env.ESBUILD_MODULE || "esbuild");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const result = await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import CancellationPanel from './components/procurement/CancellationPanel';createRoot(document.getElementById('root')).render(<CancellationPanel pidOrder="ORDER_TEST" admin={location.search.includes('admin')}/>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  platform: "browser",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "next-link",
      setup(build) {
        build.onResolve({ filter: /^next\/link$/ }, () => ({
          path: "link",
          namespace: "fixture",
        }));
        build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
          contents: `import React from 'react';export default function Link(p){return React.createElement('a',p);}`,
          loader: "js",
          resolveDir: process.cwd(),
        }));
      },
    },
  ],
});
const css = readFileSync(
  process.env.CANCELLATION_TEST_CSS ||
    "/private/tmp/sureimports-cancellation/ui.css",
  "utf8",
);
let posts = 0,
  fail = false;
const server = createServer(async (req, res) => {
  if (req.url.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "POST") {
      posts++;
      let text = "";
      for await (const chunk of req) text += chunk;
      const body = JSON.parse(text);
      assert.equal(body.confirmed, true);
      if (fail) {
        res.statusCode = 409;
        res.end(
          JSON.stringify({
            message:
              "The cancellation fee changed. Review the updated amounts.",
          }),
        );
        return;
      }
      res.end(JSON.stringify({ message: "Cancelled" }));
      return;
    }
    const fee = req.url.includes("chargeFee=true") ? "2" : "0";
    res.end(
      JSON.stringify({
        token: "test",
        feePercent: fee,
        amounts: [
          {
            currency: "NGN",
            gross: "1000.00",
            fee: fee === "2" ? "20.00" : "0.00",
            net: fee === "2" ? "980.00" : "1000.00",
          },
        ],
      }),
    );
    return;
  }
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "application/javascript");
    res.end(result.outputFiles[0].text);
    return;
  }
  res.setHeader("Content-Type", "text/html");
  res.end(
    `<html><head><style>${css}</style></head><body class="dashboard"><main style="max-width:720px;margin:24px auto;padding:16px" id="root"></main><script src="/bundle.js"></script></body></html>`,
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.goto(origin);
  await page.getByRole("button", { name: "Review cancellation" }).click();
  await page.getByText("980.00", { exact: false }).waitFor();
  const confirm = page.getByRole("button", {
    name: "Confirm cancellation",
    exact: true,
  });
  assert.equal(await confirm.isDisabled(), true);
  assert.equal(posts, 0);
  mkdirSync("/private/tmp/sureimports-cancellation/screenshots", {
    recursive: true,
  });
  for (const theme of ["light", "dark"])
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      await page.evaluate(
        (theme) =>
          document.documentElement.classList.toggle("dark", theme === "dark"),
        theme,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      assert.equal(
        await page.locator('section[aria-label="Cancel order"]').count(),
        1,
      );
      await page.locator('section[aria-label="Cancel order"]').screenshot({
        path: `/private/tmp/sureimports-cancellation/screenshots/customer-${theme}-${width}.png`,
      });
    }
  await page.getByRole("checkbox").check();
  await confirm.click();
  await page
    .getByText("Order cancelled. The refund balance has been credited.")
    .waitFor();
  assert.equal(posts, 1);
  assert.equal(
    await page.getByRole("link", { name: "View refunds" }).getAttribute("href"),
    "/dashboard/refunds",
  );
  await page.goto(origin + "?admin");
  await page.getByRole("button", { name: "Review cancellation" }).click();
  await page.getByText("Cancellation fee (0%)").waitFor();
  await page
    .getByRole("checkbox", { name: "Charge the configured cancellation fee" })
    .check();
  await page.getByText("Cancellation fee (2%)").waitFor();
  assert.equal(await confirm.isDisabled(), true);
  await page.getByRole("checkbox", { name: /I confirm cancellation/ }).check();
  fail = true;
  await confirm.click();
  await page.getByRole("alert").waitFor();
  assert.equal(await confirm.isDisabled(), true);
  await page
    .getByRole("button", { name: "Refresh cancellation amounts" })
    .click();
  await page.getByText("Cancellation fee (2%)").waitFor();
  await page.getByRole("checkbox", { name: /I confirm cancellation/ }).check();
  fail = false;
  await confirm.click();
  await page
    .getByText("Order cancelled. The refund balance has been credited.")
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: customer fee consent, admin fee toggle, stale quote error, successful refund link, mobile/desktop light/dark layout.",
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
