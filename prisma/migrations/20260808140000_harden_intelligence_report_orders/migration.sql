-- This migration mirrors sureimports.com. Apply it once to the shared database.
ALTER TABLE `intelligence_report_orders`
  ADD COLUMN `downloadTokenExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `fulfillmentAttempts` INT NOT NULL DEFAULT 0,
  ADD COLUMN `fulfillmentClaimedAt` DATETIME(3) NULL,
  ADD COLUMN `lastFulfillmentAttemptAt` DATETIME(3) NULL,
  ADD COLUMN `fulfillmentError` TEXT NULL,
  ADD COLUMN `providerCaptureReference` VARCHAR(160) NULL,
  ADD COLUMN `refundedAt` DATETIME(3) NULL,
  ADD COLUMN `revokedAt` DATETIME(3) NULL,
  ADD COLUMN `revocationReason` VARCHAR(500) NULL,
  ADD COLUMN `lastProviderEvent` VARCHAR(160) NULL,
  ADD UNIQUE INDEX `intelligence_report_orders_providerCaptureReference_key` (`providerCaptureReference`),
  ADD INDEX `iro_fulfillment_queue_idx` (`status`, `fulfilledAt`, `lastFulfillmentAttemptAt`);

UPDATE `intelligence_report_orders`
SET `downloadTokenExpiresAt` = DATE_ADD(NOW(3), INTERVAL 7 DAY)
WHERE `downloadTokenExpiresAt` IS NULL;

CREATE TABLE `intelligence_report_checkout_rate_limits` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `scopeHash` VARCHAR(64) NOT NULL,
  `bucketStart` DATETIME(3) NOT NULL,
  `attempts` INT NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ircrl_scope_bucket_key` (`scopeHash`, `bucketStart`),
  INDEX `ircrl_updated_idx` (`updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `intelligence_report_order_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidEvent` VARCHAR(80) NOT NULL,
  `orderId` VARCHAR(80) NOT NULL,
  `source` VARCHAR(40) NOT NULL,
  `eventType` VARCHAR(120) NOT NULL,
  `providerEventId` VARCHAR(160) NULL,
  `previousStatus` VARCHAR(40) NULL,
  `nextStatus` VARCHAR(40) NULL,
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `intelligence_report_order_events_pidEvent_key` (`pidEvent`),
  UNIQUE INDEX `intelligence_report_order_events_providerEventId_key` (`providerEventId`),
  INDEX `iroe_order_created_idx` (`orderId`, `createdAt`),
  INDEX `iroe_type_created_idx` (`eventType`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
