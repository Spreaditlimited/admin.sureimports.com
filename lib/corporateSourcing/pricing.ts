import { prisma } from '@/lib/prisma';

const SETTING_KEY = 'corporate_sourcing_research_fee';
const DEFAULT_NAIRA = 50_000;
const DEFAULT_USD_CENTS = 5_000;

export async function getCorporateSourcingPricing() {
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
    INSERT IGNORE INTO intelligence_report_price_settings (settingKey, priceNaira, priceUsdCents)
    VALUES (${SETTING_KEY}, ${DEFAULT_NAIRA}, ${DEFAULT_USD_CENTS})
  `;
  const rows = await prisma.$queryRaw<Array<{ priceNaira: number; priceUsdCents: number }>>`
    SELECT priceNaira, priceUsdCents
    FROM intelligence_report_price_settings
    WHERE settingKey = ${SETTING_KEY}
    LIMIT 1
  `;
  return rows[0] || { priceNaira: DEFAULT_NAIRA, priceUsdCents: DEFAULT_USD_CENTS };
}

export async function updateCorporateSourcingPricing(priceNaira: number, priceUsdCents: number) {
  await getCorporateSourcingPricing();
  await prisma.$executeRaw`
    UPDATE intelligence_report_price_settings
    SET priceNaira = ${priceNaira}, priceUsdCents = ${priceUsdCents}, updatedAt = ${new Date()}
    WHERE settingKey = ${SETTING_KEY}
  `;
  return { priceNaira, priceUsdCents };
}
