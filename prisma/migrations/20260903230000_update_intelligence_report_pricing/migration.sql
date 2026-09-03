UPDATE `intelligence_report_price_settings`
SET
  `priceNaira` = 20000,
  `priceUsdCents` = 2000,
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `settingKey` = 'manufacturer_reports';

UPDATE `intelligence_report_products`
SET
  `priceNaira` = 20000,
  `priceUsdCents` = 2000,
  `updatedAt` = CURRENT_TIMESTAMP(3);
