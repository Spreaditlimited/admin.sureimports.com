CREATE TABLE `affiliate_email_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidEvent` VARCHAR(80) NOT NULL,
  `eventKey` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(80) NOT NULL,
  `recipientHash` CHAR(64) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 1,
  `lockedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `lastError` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `affiliate_email_events_pidEvent_key` (`pidEvent`),
  UNIQUE INDEX `affiliate_email_events_eventKey_key` (`eventKey`),
  INDEX `affiliate_email_events_status_createdAt_idx` (`status`, `createdAt`),
  INDEX `affiliate_email_events_recipientHash_createdAt_idx` (`recipientHash`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
