/** Literal, case-insensitive words; quoted text is matched as a phrase. */
export function searchTerms(value: string) {
  return [...new Set((value.slice(0, 300).match(/"[^"]+"|\S+/g) || [])
    .map(term => term.replace(/^"|"$/g, '').trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

export function listPage(params: URLSearchParams, defaultLimit = 20) {
  const integer = (value: string | null, fallback: number, max: number) => {
    const n = Number(value);
    return Number.isSafeInteger(n) && n > 0 ? Math.min(n, max) : fallback;
  };
  const page = integer(params.get('page'), 1, 1000000);
  const limit = integer(params.get('limit'), defaultLimit, 100);
  return { page, limit, skip: (page - 1) * limit };
}

/** All identifiers are fixed here; user text is supplied only as bound values. */
export function documentSearch(kind: 'invoice' | 'quotation', search: string) {
  const fields = kind === 'invoice'
    ? ['invoiceNumber', 'pidInvoice', 'customerName', 'customerBusinessName', 'customerContactName', 'customerEmail', 'customerPhone', 'customerAddress', 'customerNotes', 'notes', 'headerSnapshot', 'footerSnapshot', 'linkedRequestId', 'pidQuotation']
    : ['quotationNumber', 'pidQuotation', 'customerName', 'customerLocation', 'linkedRequestId'];
  const table = kind === 'invoice' ? 'invoices' : 'quotation_builder_documents';
  const values: string[] = [];
  const clauses = searchTerms(search).map(term => {
    const like = `%${term.replace(/[!%_]/g, c => `!${c}`)}%`;
    const ors = fields.map(field => {
      values.push(like);
      return `LOWER(${table}.${field}) LIKE ? ESCAPE '!'`;
    });
    values.push(like);
    if (kind === 'invoice') {
      ors.push(`EXISTS (SELECT 1 FROM invoice_items item WHERE item.pidInvoice = invoices.pidInvoice AND LOWER(item.description) LIKE ? ESCAPE '!')`);
    } else {
      ors.push(`JSON_SEARCH(LOWER(CAST(quotation_builder_documents.quoteData AS CHAR)), 'one', ?, '!') IS NOT NULL`);
      values.push(like);
      ors.push(`EXISTS (SELECT 1 FROM invoices inv WHERE inv.pidQuotation = quotation_builder_documents.pidQuotation AND LOWER(inv.invoiceNumber) LIKE ? ESCAPE '!')`);
    }
    values.push(like, like, like);
    ors.push(`EXISTS (SELECT 1 FROM users u WHERE u.pidUser = ${table}.pidUser AND (LOWER(u.userFirstname) LIKE ? ESCAPE '!' OR LOWER(u.userLastname) LIKE ? ESCAPE '!' OR LOWER(u.userEmail) LIKE ? ESCAPE '!'))`);
    return `(${ors.join(' OR ')})`;
  });
  return { sql: clauses.length ? clauses.join(' AND ') : '1 = 1', values };
}
