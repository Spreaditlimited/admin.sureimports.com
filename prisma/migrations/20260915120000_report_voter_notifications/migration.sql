CREATE TABLE IF NOT EXISTS `intelligence_report_notifications` (
  `notificationKey` VARCHAR(64) NOT NULL,
  `requestId` VARCHAR(80) NOT NULL,
  `reportSlug` VARCHAR(180) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `query` VARCHAR(180) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `attempts` INT NOT NULL DEFAULT 0,
  `lockToken` VARCHAR(36) NULL,
  `lockedAt` DATETIME(3) NULL,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sentAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`notificationKey`),
  INDEX `report_notifications_due` (`sentAt`, `nextAttemptAt`),
  INDEX `report_notifications_request` (`requestId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
