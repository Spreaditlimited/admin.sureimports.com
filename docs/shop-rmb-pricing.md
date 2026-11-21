# RMB-linked shop prices

`store_rmb_pricing` is the private pricing basis for linked products. Keep supplier
cost and the fixed markup in RMB; do not derive them from a rounded Naira price.
`store.productPrice` is the materialized Naira selling price used by all existing
store readers, price filters, sorting and new checkout quotes.

Saving the admin RMB/NGN exchange rate updates linked product prices in the same
transaction. Both rate changes and linked product edits lock exchange-rate row 1
first, then update products. Conversion uses `(supplierRmb + markupRmb) ×
exNairaToYuan`, rounded to two Naira decimal places. Fixed-NGN products are not
repriced. Existing checkout/payment snapshots are not rewritten.

The product editor displays supplier RMB cost and RMB markup for linked products;
the Naira field is read-only. It recalculates using the latest server rate on save.
An old form without RMB fields preserves the existing RMB basis.

## Initial migration

Apply `prisma/migrations/20261121090000_store_rmb_pricing/migration.sql` before
deploying the rate-update handler. It is idempotent. Do not run unrelated pending
migrations as part of this change.

From this repository, run `node scripts/link-phone-rmb-pricing.mjs` for a dry run.
It reads the approved historical source lists from the sibling sureimports.com
repository (override the directory with `PHONE_PRICE_SOURCE_DIR`). `--apply`
links all matching visible phones, rejects unexpected prices/concurrent changes,
backs up the pre-change data to a private temporary file, and recalculates prices
at the locked current system rate. Re-running is safe only while those original
source amounts still match; later supplier/markup edits deliberately cause refusal.

Do not re-run historical phone import scripts to edit these products. Use the
admin RMB fields. Any new importer must write the pricing basis and derived NGN
price atomically while holding the rate-row lock. Exchange-rate writers must call
`syncRmbShopPrices` in their transaction; direct SQL edits bypass this application
workflow.

## Verification

- `node --test tests/shop-rmb-pricing.test.mjs`
- `node tests/shop-rmb-pricing.database.mjs` (explicit rollback-only integration test)
- Check the public product API, product page and cart quote for the same NGN price.

Never commit operational backups or customer data.
