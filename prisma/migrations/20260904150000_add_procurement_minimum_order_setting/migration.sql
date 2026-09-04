ALTER TABLE `exchange_rate`
  ADD COLUMN `procurementMinimumOrderNgn` INTEGER NOT NULL DEFAULT 50000;

UPDATE `exchange_rate`
SET `procurementMinimumOrderNgn` = 50000
WHERE `id` = 1;
