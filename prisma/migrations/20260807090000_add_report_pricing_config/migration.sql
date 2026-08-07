CREATE TABLE IF NOT EXISTS `intelligence_report_price_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `settingKey` VARCHAR(80) NOT NULL,
  `priceNaira` INT NOT NULL,
  `priceUsdCents` INT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `intelligence_report_price_settings_key` (`settingKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `intelligence_report_price_settings` (
  `settingKey`, `priceNaira`, `priceUsdCents`
) VALUES (
  'manufacturer_reports', 50000, 5000
)
ON DUPLICATE KEY UPDATE
  `priceNaira` = VALUES(`priceNaira`),
  `priceUsdCents` = VALUES(`priceUsdCents`),
  `updatedAt` = CURRENT_TIMESTAMP(3);

UPDATE `intelligence_report_products`
SET
  `priceNaira` = 50000,
  `priceUsdCents` = 5000,
  `updatedAt` = CURRENT_TIMESTAMP(3);
