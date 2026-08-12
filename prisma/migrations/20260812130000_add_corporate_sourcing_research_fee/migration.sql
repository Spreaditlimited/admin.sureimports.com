INSERT INTO `intelligence_report_price_settings` (`settingKey`, `priceNaira`, `priceUsdCents`, `createdAt`, `updatedAt`)
VALUES ('corporate_sourcing_research_fee', 50000, 5000, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `settingKey` = VALUES(`settingKey`);

CREATE TABLE IF NOT EXISTS `corporate_sourcing_research_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidPayment` VARCHAR(80) NOT NULL,
  `pidUser` VARCHAR(191) NULL,
  `requestId` VARCHAR(80) NULL,
  `email` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(120) NULL,
  `lastName` VARCHAR(120) NULL,
  `billingCountry` VARCHAR(120) NULL,
  `paymentProvider` VARCHAR(40) NOT NULL,
  `providerReference` VARCHAR(160) NULL,
  `providerCaptureReference` VARCHAR(160) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'pending',
  `amountMinor` INTEGER NOT NULL,
  `currency` VARCHAR(10) NOT NULL,
  `submissionTokenHash` VARCHAR(64) NOT NULL,
  `paidAt` DATETIME(3) NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `corporate_sourcing_payment_pid_key` (`pidPayment`),
  UNIQUE INDEX `corporate_sourcing_payment_request_key` (`requestId`),
  UNIQUE INDEX `corporate_sourcing_payment_provider_key` (`providerReference`),
  UNIQUE INDEX `corporate_sourcing_payment_capture_key` (`providerCaptureReference`),
  INDEX `corporate_sourcing_payment_email_status_idx` (`email`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
