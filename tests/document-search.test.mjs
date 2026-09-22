import assert from 'node:assert/strict';
import test from 'node:test';
import { documentSearch, listPage, searchTerms } from '../lib/invoicing/documentSearch.ts';

test('words, phrases, case and duplicate terms', () => {
  assert.deepEqual(searchTerms('  BLUE "medical scrub" blue  '), ['blue', 'medical scrub']);
  assert.deepEqual(searchTerms('   '), []);
});
test('pagination validates integers and uses the capped limit for offsets', () => {
  assert.deepEqual(listPage(new URLSearchParams()), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(listPage(new URLSearchParams('page=2&limit=1000')), { page: 2, limit: 100, skip: 100 });
  for (const value of ['NaN', 'Infinity', '-1', '0', '1.5', '1;DROP TABLE invoices']) {
    assert.deepEqual(listPage(new URLSearchParams({page:value,limit:value})), { page: 1, limit: 20, skip: 0 });
  }
});
test('searches are bound, literal and combine terms with AND', () => {
  for (const kind of ['invoice', 'quotation']) {
    const q = documentSearch(kind, '50%_! "medical scrub"');
    assert.equal((q.sql.match(/\?/g) || []).length, q.values.length);
    assert(q.values.includes('%50!%!_!!%'));
    assert(q.values.includes('%medical scrub%'));
    assert(!q.sql.includes('medical scrub'));
    assert(q.sql.includes(') AND ('));
    assert.equal(documentSearch(kind, '').sql, '1 = 1');
    const attack = documentSearch(kind, "' OR 1=1 --");
    assert(!attack.sql.includes("' OR 1=1 --"));
  }
});

test('read-only database: text contents, escaped wildcards and stable paging', { skip: process.env.RUN_DOCUMENT_DB_TESTS !== '1' }, async () => {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    for (const kind of ['invoice', 'quotation']) {
      const table = kind === 'invoice' ? 'invoices' : 'quotation_builder_documents';
      const key = kind === 'invoice' ? 'pidInvoice' : 'pidQuotation';
      const [count] = await db.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM ${table}`);
      const first = await db.$queryRawUnsafe(`SELECT ${key} AS pid FROM ${table} ORDER BY createdAt DESC, id DESC LIMIT 20`);
      const second = await db.$queryRawUnsafe(`SELECT ${key} AS pid FROM ${table} ORDER BY createdAt DESC, id DESC LIMIT 20 OFFSET 20`);
      assert(!first.some(a => second.some(b => a.pid === b.pid)));
      for (const text of ['50%_!', "' OR 1=1 --", 'NONEXISTENTDOCUMENTTEST9ZZ']) {
        const q = documentSearch(kind, text);
        await db.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM ${table} WHERE ${q.sql}`, ...q.values);
      }
      const samples = kind === 'invoice'
        ? await db.$queryRawUnsafe('SELECT pidInvoice AS pid, description AS content FROM invoice_items WHERE LENGTH(description) > 8 ORDER BY id DESC LIMIT 5')
        : await db.$queryRawUnsafe("SELECT pidQuotation AS pid, JSON_UNQUOTE(JSON_EXTRACT(quoteData, '$.products[0].name')) AS content FROM quotation_builder_documents ORDER BY id DESC LIMIT 5");
      let checked = 0;
      for (const sample of samples) {
        const phrase = sample.content?.match(/[\p{L}\p{N}][\p{L}\p{N} -]{4,60}/u)?.[0]?.trim();
        if (!phrase) continue;
        const q = documentSearch(kind, `"${phrase.toUpperCase()}"`);
        const rows = await db.$queryRawUnsafe(`SELECT ${key} AS pid FROM ${table} WHERE ${q.sql} AND ${key} = ?`, ...q.values, sample.pid);
        assert.equal(rows.length, 1, `${kind} content lookup`);
        checked++;
      }
      assert(checked > 0, `${kind}: expected stored content to verify`);
      console.log(`${kind}: ${count.n} records; ${checked} content matches; pagination and literal-search checks passed`);
    }
    // JSON_SEARCH must match actual string values, not JSON property names.
    const [json] = await db.$queryRawUnsafe("SELECT JSON_SEARCH(LOWER(CAST(? AS CHAR)), 'one', ?, '!') AS found", JSON.stringify({products:[{description:'Scrub 50%_! BLUE'}]}), '%50!%!_!!%');
    assert(json.found);
  } finally { await db.$disconnect(); }
});
