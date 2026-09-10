ALTER TABLE `intelligence_report_orders`
  ADD COLUMN `affiliateReferralReference` VARCHAR(80) NULL;

CREATE INDEX `intelligence_report_orders_affiliateReferralReference_idx`
  ON `intelligence_report_orders` (`affiliateReferralReference`);

INSERT INTO `affiliate_service_commission_rates`
  (`serviceId`, `currency`, `fixedAmount`, `percentageRate`, `active`, `createdAt`, `updatedAt`)
SELECT `id`, 'USD', 5.00, NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services`
WHERE `serviceKey` = 'SUPPLIER_REPORTS'
ON DUPLICATE KEY UPDATE
  `fixedAmount` = VALUES(`fixedAmount`),
  `active` = true,
  `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `affiliate_service_commission_rates`
  (`serviceId`, `currency`, `fixedAmount`, `percentageRate`, `active`, `createdAt`, `updatedAt`)
SELECT `id`, 'USD', 20.00, NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services`
WHERE `serviceKey` = 'PHONES_AND_LAPTOPS'
ON DUPLICATE KEY UPDATE
  `fixedAmount` = VALUES(`fixedAmount`),
  `active` = true,
  `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `affiliate_service_commission_rates`
  (`serviceId`, `currency`, `fixedAmount`, `percentageRate`, `active`, `createdAt`, `updatedAt`)
SELECT `id`, 'USD', 10.00, NULL, true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services`
WHERE `serviceKey` = 'SUPPLIER_VERIFICATION'
ON DUPLICATE KEY UPDATE
  `fixedAmount` = VALUES(`fixedAmount`),
  `active` = true,
  `updatedAt` = CURRENT_TIMESTAMP(3);
