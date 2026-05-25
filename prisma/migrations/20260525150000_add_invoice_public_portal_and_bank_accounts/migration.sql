CREATE TABLE `invoice_access_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidToken` VARCHAR(191) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `accessToken` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `lastUsedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdByPidUser` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `invoice_access_tokens_pidToken_key`(`pidToken`),
  UNIQUE INDEX `invoice_access_tokens_accessToken_key`(`accessToken`),
  INDEX `invoice_access_tokens_pidInvoice_idx`(`pidInvoice`),
  INDEX `invoice_access_tokens_accessToken_idx`(`accessToken`),
  INDEX `invoice_access_tokens_expiresAt_idx`(`expiresAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_bank_accounts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidBankAccount` VARCHAR(191) NOT NULL,
  `accountName` VARCHAR(191) NOT NULL,
  `accountNumber` VARCHAR(191) NOT NULL,
  `bankName` VARCHAR(191) NOT NULL,
  `sortCode` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
  `country` VARCHAR(191) NULL,
  `notes` LONGTEXT NULL,
  `displayOrder` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdByPidUser` VARCHAR(191) NULL,
  `updatedByPidUser` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `invoice_bank_accounts_pidBankAccount_key`(`pidBankAccount`),
  INDEX `invoice_bank_accounts_status_idx`(`status`),
  INDEX `invoice_bank_accounts_currency_idx`(`currency`),
  INDEX `invoice_bank_accounts_displayOrder_idx`(`displayOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_payment_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidClaim` VARCHAR(191) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `pidUser` VARCHAR(191) NULL,
  `claimedAmount` DECIMAL(18, 2) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
  `selectedBankAccountId` VARCHAR(191) NULL,
  `selectedBankAccountJson` LONGTEXT NULL,
  `paymentReference` VARCHAR(191) NULL,
  `note` LONGTEXT NULL,
  `claimedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
  `reviewedByPidUser` VARCHAR(191) NULL,
  `reviewedAt` DATETIME(3) NULL,
  `reviewNote` LONGTEXT NULL,
  `approvedInvoicePaymentPid` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `invoice_payment_claims_pidClaim_key`(`pidClaim`),
  INDEX `invoice_payment_claims_pidInvoice_idx`(`pidInvoice`),
  INDEX `invoice_payment_claims_pidUser_idx`(`pidUser`),
  INDEX `invoice_payment_claims_status_idx`(`status`),
  INDEX `invoice_payment_claims_claimedAt_idx`(`claimedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `invoice_access_tokens`
  ADD CONSTRAINT `invoice_access_tokens_pidInvoice_fkey`
  FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `invoice_payment_claims`
  ADD CONSTRAINT `invoice_payment_claims_pidInvoice_fkey`
  FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_payment_claims_pidUser_fkey`
  FOREIGN KEY (`pidUser`) REFERENCES `users`(`pidUser`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `invoice_bank_accounts` (
  `pidBankAccount`, `accountName`, `accountNumber`, `bankName`, `sortCode`, `currency`, `country`, `displayOrder`, `status`, `createdAt`, `updatedAt`
) VALUES
  ('IBA-NGN-001', 'Sure Importers Limited', '0766818624', 'Access Bank', NULL, 'NGN', 'Nigeria', 1, 'ACTIVE', NOW(3), NOW(3)),
  ('IBA-NGN-002', 'Spreadit Limited', '1016797924', 'Zenith Bank', NULL, 'NGN', 'Nigeria', 2, 'ACTIVE', NOW(3), NOW(3)),
  ('IBA-NGN-003', 'Spreadit Company', '0074576134', 'Sterling Bank', NULL, 'NGN', 'Nigeria', 3, 'ACTIVE', NOW(3), NOW(3)),
  ('IBA-NGN-004', 'Sure Importers Limited', '1309064618', 'Providus Bank', NULL, 'NGN', 'Nigeria', 4, 'ACTIVE', NOW(3), NOW(3)),
  ('IBA-NGN-005', 'Spreadit Limited', '0449334088', 'Guaranty Trust Bank', NULL, 'NGN', 'Nigeria', 5, 'ACTIVE', NOW(3), NOW(3)),
  ('IBA-GBP-001', 'Spreadit Sourcing Ltd', '36650768', 'Lloyds Bank', '30-54-66', 'GBP', 'United Kingdom', 6, 'ACTIVE', NOW(3), NOW(3));
