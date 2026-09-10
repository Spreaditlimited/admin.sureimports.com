ALTER TABLE `affiliate_conversions`
  ADD COLUMN `commissionBasisUnit` VARCHAR(16) NULL AFTER `commissionAmount`,
  ADD COLUMN `commissionBasisQuantity` DECIMAL(18, 4) NULL AFTER `commissionBasisUnit`,
  ADD COLUMN `commissionRate` DECIMAL(18, 4) NULL AFTER `commissionBasisQuantity`;

CREATE TABLE `affiliate_service_unit_rates` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `serviceId` INTEGER NOT NULL,
  `currency` CHAR(3) NOT NULL,
  `billingUnit` VARCHAR(16) NOT NULL,
  `destinationCountry` VARCHAR(100) NOT NULL DEFAULT '*',
  `shippingMode` VARCHAR(24) NOT NULL DEFAULT '*',
  `unitRate` DECIMAL(18, 4) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_unit_rate_scope_key` (`serviceId`, `currency`, `billingUnit`, `destinationCountry`, `shippingMode`),
  INDEX `affiliate_unit_rate_lookup_idx` (`serviceId`, `currency`, `billingUnit`, `active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_service_unit_rates_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `affiliate_program_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_api_credentials` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidCredential` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `keyPrefix` VARCHAR(24) NOT NULL,
  `keyHash` CHAR(64) NOT NULL,
  `scopes` VARCHAR(255) NOT NULL DEFAULT 'shipping:write',
  `active` BOOLEAN NOT NULL DEFAULT true,
  `expiresAt` DATETIME(3) NULL,
  `lastUsedAt` DATETIME(3) NULL,
  `createdByPidUser` VARCHAR(80) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_api_credentials_pidCredential_key` (`pidCredential`),
  UNIQUE INDEX `affiliate_api_credentials_keyHash_key` (`keyHash`),
  INDEX `affiliate_api_credentials_affiliateId_active_idx` (`affiliateId`, `active`),
  INDEX `affiliate_api_credentials_keyPrefix_active_idx` (`keyPrefix`, `active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_api_credentials_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_api_idempotency` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `credentialId` INTEGER NOT NULL,
  `idempotencyKey` VARCHAR(120) NOT NULL,
  `requestHash` CHAR(64) NOT NULL,
  `responseStatus` INTEGER NOT NULL,
  `responseBody` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_api_idempotency_credential_key` (`credentialId`, `idempotencyKey`),
  INDEX `affiliate_api_idempotency_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_api_idempotency_credentialId_fkey` FOREIGN KEY (`credentialId`) REFERENCES `affiliate_api_credentials`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shipping_request_attributions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidAttribution` VARCHAR(80) NOT NULL,
  `pidShippingOnly` VARCHAR(191) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `referralId` INTEGER NULL,
  `apiCredentialId` INTEGER NULL,
  `sourceType` VARCHAR(32) NOT NULL,
  `sourceReference` VARCHAR(191) NULL,
  `lockedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `shipping_request_attributions_pidAttribution_key` (`pidAttribution`),
  UNIQUE INDEX `shipping_request_attributions_pidShippingOnly_key` (`pidShippingOnly`),
  INDEX `shipping_request_attributions_affiliateId_createdAt_idx` (`affiliateId`, `createdAt`),
  INDEX `shipping_request_attributions_referralId_idx` (`referralId`),
  INDEX `shipping_request_attributions_apiCredentialId_idx` (`apiCredentialId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `shipping_request_attributions_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipping_request_attributions_referralId_fkey` FOREIGN KEY (`referralId`) REFERENCES `affiliate_referrals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_request_attributions_apiCredentialId_fkey` FOREIGN KEY (`apiCredentialId`) REFERENCES `affiliate_api_credentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipping_request_attributions_pidShippingOnly_fkey` FOREIGN KEY (`pidShippingOnly`) REFERENCES `shipping_only`(`pidShippingOnly`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_affiliate_commission_snapshots` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidSnapshot` VARCHAR(80) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `shippingAttributionId` INTEGER NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `referralId` INTEGER NULL,
  `serviceId` INTEGER NOT NULL,
  `billingUnit` VARCHAR(16) NOT NULL,
  `eligibleQuantity` DECIMAL(18, 4) NOT NULL,
  `commissionCurrency` CHAR(3) NOT NULL,
  `unitRate` DECIMAL(18, 4) NOT NULL,
  `commissionAmount` DECIMAL(18, 2) NOT NULL,
  `sourceType` VARCHAR(32) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'EXPECTED',
  `conversionId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `invoice_affiliate_commission_snapshots_pidSnapshot_key` (`pidSnapshot`),
  UNIQUE INDEX `invoice_affiliate_commission_snapshots_pidInvoice_key` (`pidInvoice`),
  UNIQUE INDEX `invoice_affiliate_commission_snapshots_conversionId_key` (`conversionId`),
  INDEX `invoice_affiliate_commission_snapshots_affiliateId_status_idx` (`affiliateId`, `status`),
  INDEX `invoice_affiliate_commission_snapshots_shippingAttributionId_idx` (`shippingAttributionId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `invoice_affiliate_snapshot_pidInvoice_fkey` FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `invoice_affiliate_snapshot_attributionId_fkey` FOREIGN KEY (`shippingAttributionId`) REFERENCES `shipping_request_attributions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `invoice_affiliate_snapshot_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `invoice_affiliate_snapshot_referralId_fkey` FOREIGN KEY (`referralId`) REFERENCES `affiliate_referrals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `invoice_affiliate_snapshot_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `affiliate_program_services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `invoice_affiliate_snapshot_conversionId_fkey` FOREIGN KEY (`conversionId`) REFERENCES `affiliate_conversions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `affiliate_program_services`
  (`pidService`, `serviceKey`, `displayName`, `description`, `commissionType`, `percentageRate`, `eligibleAmountBasis`, `recurring`, `approvalMode`, `reviewPeriodDays`, `exclusionNotes`, `active`, `sortOrder`, `updatedAt`)
VALUES
  ('afsvc_ship_with_us', 'SHIP_WITH_US', 'Ship with Us', 'Commission on eligible air and sea shipping-only invoices, calculated from the final billable quantity.', 'PER_UNIT', NULL, 'FINAL_BILLABLE_QUANTITY', false, 'MANUAL', 14, 'Duties, storage, verification, penalties, handling and unrelated invoice charges are excluded unless explicitly configured.', true, 60, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `displayName` = VALUES(`displayName`),
  `description` = VALUES(`description`),
  `commissionType` = 'PER_UNIT',
  `percentageRate` = NULL,
  `eligibleAmountBasis` = VALUES(`eligibleAmountBasis`),
  `recurring` = false,
  `approvalMode` = VALUES(`approvalMode`),
  `reviewPeriodDays` = VALUES(`reviewPeriodDays`),
  `exclusionNotes` = VALUES(`exclusionNotes`),
  `active` = true,
  `sortOrder` = VALUES(`sortOrder`),
  `updatedAt` = CURRENT_TIMESTAMP(3);

INSERT INTO `affiliate_service_unit_rates`
  (`serviceId`, `currency`, `billingUnit`, `destinationCountry`, `shippingMode`, `unitRate`, `active`, `updatedAt`)
SELECT `id`, 'USD', 'KG', '*', '*', 0.5000, true, CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services` WHERE `serviceKey` = 'SHIP_WITH_US';

INSERT INTO `affiliate_service_unit_rates`
  (`serviceId`, `currency`, `billingUnit`, `destinationCountry`, `shippingMode`, `unitRate`, `active`, `updatedAt`)
SELECT `id`, 'NGN', 'KG', '*', '*', 500.0000, true, CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services` WHERE `serviceKey` = 'SHIP_WITH_US';

INSERT INTO `affiliate_service_unit_rates`
  (`serviceId`, `currency`, `billingUnit`, `destinationCountry`, `shippingMode`, `unitRate`, `active`, `updatedAt`)
SELECT `id`, 'NGN', 'CBM', 'NIGERIA', '*', 10000.0000, true, CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services` WHERE `serviceKey` = 'SHIP_WITH_US';
