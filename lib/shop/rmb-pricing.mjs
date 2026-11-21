import { Prisma } from '@prisma/client';

export function rmbPriceNgn(supplierRmb, markupRmb, rate) {
  const supplier = Number(supplierRmb);
  const markup = Number(markupRmb);
  const fx = Number(rate);
  if (!Number.isFinite(supplier) || supplier <= 0 ||
      !Number.isFinite(markup) || markup < 0 ||
      !Number.isFinite(fx) || fx <= 0) {
    throw new Error('RMB supplier price and exchange rate must be positive; markup cannot be negative.');
  }
  if (new Prisma.Decimal(supplier).decimalPlaces() > 2 || new Prisma.Decimal(markup).decimalPlaces() > 2) {
    throw new Error('RMB amounts support at most two decimal places.');
  }
  const minor = new Prisma.Decimal(supplier).plus(markup).times(fx).times(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('Invalid converted product price.');
  return minor / 100;
}

/** Keep the rate row locked before touching products, in every writer. */
export async function lockShopRate(tx) {
  const rows = await tx.$queryRaw`SELECT exNairaToYuan FROM exchange_rate WHERE id = 1 FOR UPDATE`;
  const rate = Number(rows[0]?.exNairaToYuan);
  rmbPriceNgn(1, 0, rate);
  return rate;
}

/** The materialized NGN price serves listing filters, checkout and legacy readers. */
export async function syncRmbShopPrices(tx, rate) {
  rmbPriceNgn(1, 0, rate);
  const rows = await tx.$queryRaw`SELECT pidProduct, supplierRmb, markupRmb FROM store_rmb_pricing`;
  for (const row of rows) rmbPriceNgn(row.supplierRmb, row.markupRmb, rate);
  return tx.$executeRaw`
    UPDATE store s JOIN store_rmb_pricing p ON p.pidProduct = s.pidProduct
    SET s.productPrice = ROUND((p.supplierRmb + p.markupRmb) * ${new Prisma.Decimal(rate)}, 2),
        s.updatedAt = NOW(3)
    WHERE s.productPrice IS NULL OR
          s.productPrice <> ROUND((p.supplierRmb + p.markupRmb) * ${new Prisma.Decimal(rate)}, 2)
  `;
}

/** Product edits must not replace a rate-linked price with a stale form value. */
export async function updateStoreWithRmbPricing(tx, pidProduct, data, source) {
  const rate = await lockShopRate(tx);
  const rows = await tx.$queryRaw`SELECT supplierRmb, markupRmb FROM store_rmb_pricing WHERE pidProduct = ${pidProduct} FOR UPDATE`;
  const linked = rows[0];
  if (linked) {
    const supplier = source?.supplierRmb ?? Number(linked.supplierRmb);
    const markup = source?.markupRmb ?? Number(linked.markupRmb);
    data = { ...data, productPrice: rmbPriceNgn(supplier, markup, rate) };
    if (source) {
      await tx.$executeRaw`UPDATE store_rmb_pricing SET supplierRmb = ${supplier}, markupRmb = ${markup}, updatedAt = NOW(3) WHERE pidProduct = ${pidProduct}`;
    }
  } else if (source) {
    throw new Error('This product is not configured for RMB pricing.');
  }
  return tx.store.update({ where: { pidProduct }, data });
}
