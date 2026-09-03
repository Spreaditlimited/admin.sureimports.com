import { prisma } from "@/lib/prisma";

export const REPORT_PRICING_KEY = "manufacturer_reports";
export const DEFAULT_REPORT_PRICE_NAIRA = 20_000;
export const DEFAULT_REPORT_PRICE_USD_CENTS = 2_000;

export type ReportPricing = {
  priceNaira: number;
  priceUsdCents: number;
};

export async function ensureReportPricing() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS intelligence_report_price_settings (
      id INT NOT NULL AUTO_INCREMENT,
      settingKey VARCHAR(80) NOT NULL,
      priceNaira INT NOT NULL,
      priceUsdCents INT NOT NULL,
      createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY intelligence_report_price_settings_key (settingKey),
      PRIMARY KEY (id)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  `);
  await prisma.$executeRaw`
    INSERT IGNORE INTO intelligence_report_price_settings (
      settingKey, priceNaira, priceUsdCents
    ) VALUES (
      ${REPORT_PRICING_KEY}, ${DEFAULT_REPORT_PRICE_NAIRA}, ${DEFAULT_REPORT_PRICE_USD_CENTS}
    )
  `;
}

export async function getReportPricing(): Promise<ReportPricing> {
  await ensureReportPricing();
  const rows = await prisma.$queryRaw<ReportPricing[]>`
    SELECT priceNaira, priceUsdCents
    FROM intelligence_report_price_settings
    WHERE settingKey = ${REPORT_PRICING_KEY}
    LIMIT 1
  `;
  return (
    rows[0] || {
      priceNaira: DEFAULT_REPORT_PRICE_NAIRA,
      priceUsdCents: DEFAULT_REPORT_PRICE_USD_CENTS,
    }
  );
}

export async function updateReportPricing(pricing: ReportPricing) {
  await ensureReportPricing();
  const now = new Date();
  await prisma.$transaction([
    prisma.$executeRaw`
      UPDATE intelligence_report_price_settings
      SET
        priceNaira = ${pricing.priceNaira},
        priceUsdCents = ${pricing.priceUsdCents},
        updatedAt = ${now}
      WHERE settingKey = ${REPORT_PRICING_KEY}
    `,
    prisma.intelligence_report_products.updateMany({
      data: {
        priceNaira: pricing.priceNaira,
        priceUsdCents: pricing.priceUsdCents,
        updatedAt: now,
      },
    }),
  ]);
  return pricing;
}
