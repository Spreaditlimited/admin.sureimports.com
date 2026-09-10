ALTER TABLE `affiliate_conversions`
  ADD COLUMN `releaseMode` VARCHAR(24) NOT NULL DEFAULT 'MANUAL' AFTER `status`,
  ADD COLUMN `releaseAt` DATETIME(3) NULL AFTER `releaseMode`;

CREATE INDEX `affiliate_conversions_status_releaseAt_idx`
  ON `affiliate_conversions`(`status`, `releaseAt`);
