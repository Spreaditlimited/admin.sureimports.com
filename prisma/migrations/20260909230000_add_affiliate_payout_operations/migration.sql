CREATE TABLE `affiliate_payout_account_otps` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidOtp` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `provider` VARCHAR(24) NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `targetHash` CHAR(64) NOT NULL,
  `otpHash` CHAR(64) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `maxAttempts` INTEGER NOT NULL DEFAULT 5,
  `expiresAt` DATETIME(3) NOT NULL,
  `verifiedAt` DATETIME(3) NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_payout_account_otps_pidOtp_key`(`pidOtp`),
  INDEX `apao_aff_provider_currency_status_idx`(`affiliateId`, `provider`, `currency`, `status`),
  INDEX `apao_expires_status_idx`(`expiresAt`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_payout_account_otps_affiliateId_fkey`
    FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `affiliate_payouts`
  ADD COLUMN `providerStatus` VARCHAR(80) NULL,
  ADD COLUMN `approvedAt` DATETIME(3) NULL,
  ADD COLUMN `approvedBy` VARCHAR(191) NULL,
  ADD COLUMN `lastCheckedAt` DATETIME(3) NULL,
  ADD COLUMN `attemptCount` INTEGER NOT NULL DEFAULT 0;
