-- Central LineScout payment ledger and affiliate-program consolidation.
-- This migration is additive so it can be applied before the application cutover.

CREATE TABLE `affiliate_service_event_rules` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidEventRule` VARCHAR(80) NOT NULL,
  `serviceId` INTEGER NOT NULL,
  `eventKey` VARCHAR(80) NOT NULL,
  `displayName` VARCHAR(140) NOT NULL,
  `description` TEXT NULL,
  `commissionType` VARCHAR(24) NOT NULL DEFAULT 'PERCENTAGE',
  `percentageRate` DECIMAL(7,4) NULL,
  `eligibleAmountBasis` VARCHAR(40) NOT NULL DEFAULT 'PRODUCT_OR_SERVICE_AMOUNT',
  `active` BOOLEAN NOT NULL DEFAULT true,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_service_event_rules_pidEventRule_key`(`pidEventRule`),
  UNIQUE INDEX `affiliate_service_event_rule_key`(`serviceId`, `eventKey`),
  INDEX `affiliate_service_event_rules_serviceId_active_sortOrder_idx`(`serviceId`, `active`, `sortOrder`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_service_event_rules_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `affiliate_program_services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_external_identities` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidIdentity` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `sourceSystem` VARCHAR(40) NOT NULL,
  `externalAffiliateId` VARCHAR(120) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `affiliate_external_identities_pidIdentity_key`(`pidIdentity`),
  UNIQUE INDEX `affiliate_external_identity_key`(`sourceSystem`, `externalAffiliateId`),
  INDEX `affiliate_external_identities_affiliateId_sourceSystem_idx`(`affiliateId`, `sourceSystem`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_external_identities_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_referral_code_aliases` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidAlias` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `sourceSystem` VARCHAR(40) NOT NULL,
  `aliasCode` VARCHAR(40) NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `affiliate_referral_code_aliases_pidAlias_key`(`pidAlias`),
  UNIQUE INDEX `affiliate_referral_alias_key`(`sourceSystem`, `aliasCode`),
  INDEX `affiliate_referral_code_aliases_affiliateId_active_idx`(`affiliateId`, `active`),
  PRIMARY KEY (`id`),
  CONSTRAINT `affiliate_referral_code_aliases_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_ledger_entries` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidLedgerEntry` VARCHAR(80) NOT NULL,
  `sourceSystem` VARCHAR(40) NOT NULL,
  `sourcePaymentType` VARCHAR(80) NOT NULL,
  `sourcePaymentId` VARCHAR(160) NOT NULL,
  `sourceOrderReference` VARCHAR(160) NULL,
  `customerReference` VARCHAR(191) NULL,
  `purpose` VARCHAR(80) NOT NULL,
  `provider` VARCHAR(40) NULL,
  `providerReference` VARCHAR(191) NULL,
  `status` VARCHAR(24) NOT NULL,
  `originalCurrency` CHAR(3) NOT NULL,
  `originalAmount` DECIMAL(18,2) NOT NULL,
  `eligibleAmount` DECIMAL(18,2) NOT NULL,
  `settlementCurrency` CHAR(3) NULL,
  `settlementAmount` DECIMAL(18,2) NULL,
  `fxRate` DECIMAL(18,8) NULL,
  `fxSource` VARCHAR(80) NULL,
  `fxCapturedAt` DATETIME(3) NULL,
  `billingUnit` VARCHAR(16) NULL,
  `eligibleQuantity` DECIMAL(18,4) NULL,
  `destinationCountry` VARCHAR(100) NULL,
  `shippingMode` VARCHAR(24) NULL,
  `occurredAt` DATETIME(3) NOT NULL,
  `metadataJson` LONGTEXT NULL,
  `processingStatus` VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  `processingError` VARCHAR(1000) NULL,
  `processedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `payment_ledger_entries_pidLedgerEntry_key`(`pidLedgerEntry`),
  UNIQUE INDEX `payment_ledger_source_key`(`sourceSystem`, `sourcePaymentType`, `sourcePaymentId`),
  INDEX `payment_ledger_entries_status_occurredAt_idx`(`status`, `occurredAt`),
  INDEX `payment_ledger_entries_customerReference_occurredAt_idx`(`customerReference`, `occurredAt`),
  INDEX `payment_ledger_entries_providerReference_idx`(`providerReference`),
  INDEX `payment_ledger_entries_processingStatus_updatedAt_idx`(`processingStatus`, `updatedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `payment_ledger_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidLedgerEvent` VARCHAR(80) NOT NULL,
  `externalEventId` VARCHAR(191) NOT NULL,
  `ledgerEntryId` INTEGER NULL,
  `sourceSystem` VARCHAR(40) NOT NULL,
  `eventType` VARCHAR(40) NOT NULL,
  `payloadHash` CHAR(64) NOT NULL,
  `payloadJson` LONGTEXT NOT NULL,
  `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `processedAt` DATETIME(3) NULL,
  `processingError` VARCHAR(1000) NULL,
  UNIQUE INDEX `payment_ledger_events_pidLedgerEvent_key`(`pidLedgerEvent`),
  UNIQUE INDEX `payment_ledger_events_externalEventId_key`(`externalEventId`),
  INDEX `payment_ledger_events_sourceSystem_receivedAt_idx`(`sourceSystem`, `receivedAt`),
  INDEX `payment_ledger_events_ledgerEntryId_idx`(`ledgerEntryId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `payment_ledger_events_ledgerEntryId_fkey` FOREIGN KEY (`ledgerEntryId`) REFERENCES `payment_ledger_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `affiliate_conversions`
  ADD COLUMN `sourceSystem` VARCHAR(40) NOT NULL DEFAULT 'SURE_IMPORTS',
  ADD COLUMN `sourceEventKey` VARCHAR(80) NULL,
  ADD COLUMN `paymentLedgerEntryId` INTEGER NULL;

CREATE UNIQUE INDEX `affiliate_conversions_paymentLedgerEntryId_key` ON `affiliate_conversions`(`paymentLedgerEntryId`);
ALTER TABLE `affiliate_conversions`
  ADD CONSTRAINT `affiliate_conversions_paymentLedgerEntryId_fkey` FOREIGN KEY (`paymentLedgerEntryId`) REFERENCES `payment_ledger_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `affiliate_program_services`
  (`pidService`, `serviceKey`, `displayName`, `description`, `commissionType`, `percentageRate`, `eligibleAmountBasis`, `recurring`, `approvalMode`, `reviewPeriodDays`, `exclusionNotes`, `active`, `sortOrder`, `createdAt`, `updatedAt`)
VALUES
  ('afsvc_linescout_sourcing', 'LINESCOUT_SOURCING', 'LineScout Sourcing', 'Earn when referred customers pay for eligible LineScout sourcing services.', 'PERCENTAGE', 2.0000, 'EVENT_ELIGIBLE_AMOUNT', false, 'AUTOMATIC', 14, 'Shipping is commissioned separately under Ship With Us using final billed kg or CBM.', true, 70, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE
  `displayName` = VALUES(`displayName`),
  `description` = VALUES(`description`),
  `eligibleAmountBasis` = VALUES(`eligibleAmountBasis`),
  `exclusionNotes` = VALUES(`exclusionNotes`);

INSERT INTO `affiliate_service_event_rules`
  (`pidEventRule`, `serviceId`, `eventKey`, `displayName`, `description`, `commissionType`, `percentageRate`, `eligibleAmountBasis`, `active`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT 'afevt_linescout_commitment', `id`, 'COMMITMENT_FEE', 'Commitment fee', 'Percentage of the eligible LineScout commitment fee.', 'PERCENTAGE', 10.0000, 'SERVICE_AMOUNT_EXCLUDING_FEES', true, 10, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services` WHERE `serviceKey` = 'LINESCOUT_SOURCING'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`);
INSERT INTO `affiliate_service_event_rules`
  (`pidEventRule`, `serviceId`, `eventKey`, `displayName`, `description`, `commissionType`, `percentageRate`, `eligibleAmountBasis`, `active`, `sortOrder`, `createdAt`, `updatedAt`)
SELECT 'afevt_linescout_project', `id`, 'PROJECT_PAYMENT', 'Project payment', 'Percentage of the eligible product or sourcing project payment, excluding shipping and processing fees.', 'PERCENTAGE', 2.0000, 'PRODUCT_OR_SERVICE_AMOUNT', true, 20, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `affiliate_program_services` WHERE `serviceKey` = 'LINESCOUT_SOURCING'
ON DUPLICATE KEY UPDATE `displayName` = VALUES(`displayName`);
