import assert from "node:assert/strict";
import test from "node:test";

import { buildWhatsAppUrl, normalizeWhatsAppNumber } from "../lib/whatsapp.ts";

test("normalizes common Nigerian mobile formats to E.164 digits", () => {
  assert.equal(
    normalizeWhatsAppNumber("0803 123 4567", "Nigeria")?.digits,
    "2348031234567",
  );
  assert.equal(
    normalizeWhatsAppNumber("+234 803 123 4567", "Nigeria")?.digits,
    "2348031234567",
  );
  assert.equal(
    normalizeWhatsAppNumber("8031234567", "Nigeria")?.digits,
    "2348031234567",
  );
});

test("preserves explicit international country codes", () => {
  assert.equal(
    normalizeWhatsAppNumber("+44 7700 900123", "United Kingdom")?.digits,
    "447700900123",
  );
  assert.equal(
    normalizeWhatsAppNumber("0044 7700 900123", "United Kingdom")?.digits,
    "447700900123",
  );
});

test("does not invent a country code for an ambiguous foreign local number", () => {
  assert.equal(normalizeWhatsAppNumber("07700 900123", "United Kingdom"), null);
});

test("builds an encoded WhatsApp chat URL", () => {
  assert.equal(
    buildWhatsAppUrl("2348031234567", "Hello Order #1"),
    "https://wa.me/2348031234567?text=Hello%20Order%20%231",
  );
});
