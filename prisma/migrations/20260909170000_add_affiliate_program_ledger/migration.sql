CREATE TABLE `affiliate_program_services` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidService` VARCHAR(80) NOT NULL,
  `serviceKey` VARCHAR(80) NOT NULL,
  `displayName` VARCHAR(140) NOT NULL,
  `description` TEXT NULL,
  `commissionType` VARCHAR(24) NOT NULL,
  `percentageRate` DECIMAL(7, 4) NULL,
  `eligibleAmountBasis` VARCHAR(40) NOT NULL,
  `recurring` BOOLEAN NOT NULL DEFAULT false,
  `exclusionNotes` TEXT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_program_services_pidService_key`(`pidService`),
  UNIQUE INDEX `affiliate_program_services_serviceKey_key`(`serviceKey`),
  INDEX `affiliate_program_services_active_sortOrder_idx`(`active`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_service_commission_rates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `serviceId` INTEGER NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `fixedAmount` DECIMAL(18, 2) NULL,
  `percentageRate` DECIMAL(7, 4) NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_service_commission_rates_serviceId_currency_key`(`serviceId`, `currency`),
  INDEX `affiliate_service_commission_rates_currency_active_idx`(`currency`, `active`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_referrals` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidReferral` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `visitorHash` CHAR(64) NOT NULL,
  `landingPath` VARCHAR(500) NOT NULL,
  `source` VARCHAR(255) NULL,
  `firstTouchAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastTouchAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `convertedAt` DATETIME(3) NULL,
  UNIQUE INDEX `affiliate_referrals_pidReferral_key`(`pidReferral`),
  INDEX `affiliate_referrals_affiliateId_firstTouchAt_idx`(`affiliateId`, `firstTouchAt`),
  INDEX `affiliate_referrals_visitorHash_lastTouchAt_idx`(`visitorHash`, `lastTouchAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_conversions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidConversion` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `serviceId` INTEGER NOT NULL,
  `referralId` INTEGER NULL,
  `externalOrderReference` VARCHAR(120) NOT NULL,
  `externalPaymentReference` VARCHAR(160) NULL,
  `paymentCurrency` CHAR(3) NOT NULL,
  `grossAmount` DECIMAL(18, 2) NOT NULL,
  `eligibleAmount` DECIMAL(18, 2) NOT NULL,
  `commissionCurrency` CHAR(3) NOT NULL,
  `commissionAmount` DECIMAL(18, 2) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  `approvedAt` DATETIME(3) NULL,
  `availableAt` DATETIME(3) NULL,
  `voidedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_conversions_pidConversion_key`(`pidConversion`),
  UNIQUE INDEX `affiliate_conversions_externalPaymentReference_key`(`externalPaymentReference`),
  UNIQUE INDEX `affiliate_conversions_externalOrderReference_serviceId_key`(`externalOrderReference`, `serviceId`),
  INDEX `affiliate_conversions_affiliateId_status_createdAt_idx`(`affiliateId`, `status`, `createdAt`),
  INDEX `affiliate_conversions_serviceId_createdAt_idx`(`serviceId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_payout_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidPayoutAccount` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `provider` VARCHAR(24) NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `detailsCiphertext` TEXT NOT NULL,
  `recipientReference` VARCHAR(180) NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_payout_accounts_pidPayoutAccount_key`(`pidPayoutAccount`),
  UNIQUE INDEX `affiliate_payout_accounts_affiliateId_provider_currency_key`(`affiliateId`, `provider`, `currency`),
  INDEX `affiliate_payout_accounts_affiliateId_isDefault_idx`(`affiliateId`, `isDefault`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_payouts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidPayout` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `payoutAccountId` INTEGER NULL,
  `provider` VARCHAR(24) NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'REQUESTED',
  `externalReference` VARCHAR(180) NULL,
  `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `failedAt` DATETIME(3) NULL,
  `failureReason` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_payouts_pidPayout_key`(`pidPayout`),
  UNIQUE INDEX `affiliate_payouts_externalReference_key`(`externalReference`),
  INDEX `affiliate_payouts_affiliateId_status_requestedAt_idx`(`affiliateId`, `status`, `requestedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_payout_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `payoutId` INTEGER NOT NULL,
  `conversionId` INTEGER NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `affiliate_payout_items_conversionId_key`(`conversionId`),
  INDEX `affiliate_payout_items_payoutId_idx`(`payoutId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `affiliate_service_commission_rates` ADD CONSTRAINT `affiliate_service_commission_rates_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `affiliate_program_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_referrals` ADD CONSTRAINT `affiliate_referrals_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_conversions` ADD CONSTRAINT `affiliate_conversions_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_conversions` ADD CONSTRAINT `affiliate_conversions_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `affiliate_program_services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `affiliate_conversions` ADD CONSTRAINT `affiliate_conversions_referralId_fkey` FOREIGN KEY (`referralId`) REFERENCES `affiliate_referrals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `affiliate_payout_accounts` ADD CONSTRAINT `affiliate_payout_accounts_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_payouts` ADD CONSTRAINT `affiliate_payouts_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_payouts` ADD CONSTRAINT `affiliate_payouts_payoutAccountId_fkey` FOREIGN KEY (`payoutAccountId`) REFERENCES `affiliate_payout_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `affiliate_payout_items` ADD CONSTRAINT `affiliate_payout_items_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `affiliate_payouts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_payout_items` ADD CONSTRAINT `affiliate_payout_items_conversionId_fkey` FOREIGN KEY (`conversionId`) REFERENCES `affiliate_conversions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO `affiliate_program_services` (`pidService`, `serviceKey`, `displayName`, `description`, `commissionType`, `percentageRate`, `eligibleAmountBasis`, `recurring`, `exclusionNotes`, `active`, `sortOrder`, `updatedAt`) VALUES
  ('afsvc_buy_chinese_websites', 'BUY_FROM_CHINESE_WEBSITES', 'Buy from Chinese Websites', 'Commission is calculated only on eligible product cost, not the total order.', 'PERCENTAGE', 2.0000, 'PRODUCT_COST', false, 'Shipping, duties, fees and other non-product order costs are excluded.', true, 10, CURRENT_TIMESTAMP(3)),
  ('afsvc_supplier_reports', 'SUPPLIER_REPORTS', 'Supplier Reports', 'Fixed commission for each eligible supplier report purchase.', 'FIXED', NULL, 'QUALIFYING_PAYMENT', false, NULL, true, 20, CURRENT_TIMESTAMP(3)),
  ('afsvc_phones_laptops', 'PHONES_AND_LAPTOPS', 'Phones and Laptops', 'Fixed commission for each eligible phone or laptop referral purchase.', 'FIXED', NULL, 'QUALIFYING_PAYMENT', false, NULL, true, 30, CURRENT_TIMESTAMP(3)),
  ('afsvc_supplier_intelligence', 'SUPPLIER_INTELLIGENCE', 'Supplier Intelligence', 'Commission is earned on the original subscription and every eligible renewal.', 'PERCENTAGE', 10.0000, 'SUBSCRIPTION_PAYMENT', true, NULL, true, 40, CURRENT_TIMESTAMP(3)),
  ('afsvc_supplier_verification', 'SUPPLIER_VERIFICATION', 'Supplier Verification', 'Fixed commission on the main supplier verification payment.', 'FIXED', NULL, 'QUALIFYING_PAYMENT', false, 'Factory visit transportation costs are excluded.', true, 50, CURRENT_TIMESTAMP(3));

INSERT INTO `affiliate_service_commission_rates` (`serviceId`, `currency`, `fixedAmount`, `percentageRate`, `active`, `updatedAt`)
SELECT `id`, 'NGN', 5000.00, NULL, true, CURRENT_TIMESTAMP(3) FROM `affiliate_program_services` WHERE `serviceKey` = 'SUPPLIER_REPORTS';

INSERT INTO `affiliate_service_commission_rates` (`serviceId`, `currency`, `fixedAmount`, `percentageRate`, `active`, `updatedAt`)
SELECT `id`, 'NGN', 20000.00, NULL, true, CURRENT_TIMESTAMP(3) FROM `affiliate_program_services` WHERE `serviceKey` = 'PHONES_AND_LAPTOPS';

INSERT INTO `affiliate_service_commission_rates` (`serviceId`, `currency`, `fixedAmount`, `percentageRate`, `active`, `updatedAt`)
SELECT `id`, 'NGN', 10000.00, NULL, true, CURRENT_TIMESTAMP(3) FROM `affiliate_program_services` WHERE `serviceKey` = 'SUPPLIER_VERIFICATION';
