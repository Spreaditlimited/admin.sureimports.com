UPDATE `affiliate_service_unit_rates` AS `rate`
INNER JOIN `affiliate_program_services` AS `service` ON `service`.`id` = `rate`.`serviceId`
SET `rate`.`unitRate` = 750.0000, `rate`.`updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `service`.`serviceKey` = 'SHIP_WITH_US'
  AND `rate`.`currency` = 'NGN'
  AND `rate`.`billingUnit` = 'KG'
  AND `rate`.`destinationCountry` = '*'
  AND `rate`.`shippingMode` = '*'
  AND `rate`.`unitRate` = 500.0000;
