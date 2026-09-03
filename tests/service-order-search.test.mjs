import assert from "node:assert/strict";
import test from "node:test";

import { matchesServiceOrderSearch } from "../lib/serviceOrderSearch.ts";

test("matches case-insensitively across order fields", () => {
  assert.equal(
    matchesServiceOrderSearch("ada supplier", [
      "PROC-1042",
      "Ada Okafor",
      "Golden Supplier Limited",
    ]),
    true,
  );
});

test("matches formatted phone numbers using digit fragments", () => {
  assert.equal(
    matchesServiceOrderSearch("0803 123", ["+234 (803) 123-4567"]),
    true,
  );
});

test("requires every search term to match somewhere", () => {
  assert.equal(
    matchesServiceOrderSearch("lagos air", ["Lagos", "Sea freight"]),
    false,
  );
});

test("treats an empty query as a match", () => {
  assert.equal(matchesServiceOrderSearch("   ", []), true);
});
