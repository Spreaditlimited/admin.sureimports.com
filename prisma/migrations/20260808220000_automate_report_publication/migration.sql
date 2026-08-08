ALTER TABLE `intelligence_report_products`
  ADD COLUMN `coverImagePublicId` VARCHAR(500) NULL,
  ADD COLUMN `coverImageBytes` INT NULL,
  ADD COLUMN `seoProfile` JSON NULL,
  ADD COLUMN `automationStatus` VARCHAR(40) NOT NULL DEFAULT 'idle',
  ADD COLUMN `automationError` TEXT NULL,
  ADD COLUMN `automationStartedAt` DATETIME(3) NULL,
  ADD COLUMN `automationCompletedAt` DATETIME(3) NULL;

UPDATE `intelligence_report_products`
SET `automationStatus` = 'completed',
    `automationCompletedAt` = COALESCE(`publishedAt`, `updatedAt`)
WHERE `status` = 'published';
