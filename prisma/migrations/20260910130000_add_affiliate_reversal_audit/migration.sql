ALTER TABLE `affiliate_conversions`
  ADD COLUMN `reversedFromStatus` VARCHAR(24) NULL AFTER `voidedAt`,
  ADD COLUMN `reversalReason` TEXT NULL AFTER `reversedFromStatus`,
  ADD COLUMN `reversalReference` VARCHAR(160) NULL AFTER `reversalReason`;
