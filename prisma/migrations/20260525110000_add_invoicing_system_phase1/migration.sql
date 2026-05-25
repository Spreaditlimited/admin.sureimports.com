CREATE TABLE `invoice_settings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidSetting` VARCHAR(191) NOT NULL,
  `businessName` VARCHAR(191) NOT NULL,
  `businessContactDetails` LONGTEXT NOT NULL,
  `footerNotes` LONGTEXT NOT NULL,
  `status` VARCHAR(191) NULL DEFAULT 'ACTIVE',
  `createdByPidUser` VARCHAR(191) NULL,
  `updatedByPidUser` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `invoice_settings_pidSetting_key`(`pidSetting`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NOT NULL,
  `pidUser` VARCHAR(191) NOT NULL,
  `customerName` VARCHAR(191) NULL,
  `customerEmail` VARCHAR(191) NULL,
  `customerPhone` VARCHAR(191) NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
  `subtotal` DECIMAL(18, 2) NOT NULL,
  `discountTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
  `taxTotal` DECIMAL(18, 2) NOT NULL DEFAULT 0,
  `grandTotal` DECIMAL(18, 2) NOT NULL,
  `amountPaid` DECIMAL(18, 2) NOT NULL DEFAULT 0,
  `balanceDue` DECIMAL(18, 2) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
  `issuedAt` DATETIME(3) NULL,
  `dueAt` DATETIME(3) NULL,
  `paidAt` DATETIME(3) NULL,
  `headerSnapshot` LONGTEXT NULL,
  `footerSnapshot` LONGTEXT NULL,
  `notes` LONGTEXT NULL,
  `linkedRequestId` VARCHAR(191) NULL,
  `createdByPidUser` VARCHAR(191) NULL,
  `updatedByPidUser` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `invoices_pidInvoice_key`(`pidInvoice`),
  UNIQUE INDEX `invoices_invoiceNumber_key`(`invoiceNumber`),
  INDEX `invoices_pidUser_idx`(`pidUser`),
  INDEX `invoices_status_idx`(`status`),
  INDEX `invoices_createdAt_idx`(`createdAt`),
  INDEX `invoices_dueAt_idx`(`dueAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_items` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidInvoiceItem` VARCHAR(191) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `lineNo` INTEGER NOT NULL,
  `description` LONGTEXT NOT NULL,
  `quantity` DECIMAL(18, 2) NOT NULL,
  `unitPrice` DECIMAL(18, 2) NOT NULL,
  `lineTotal` DECIMAL(18, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `invoice_items_pidInvoiceItem_key`(`pidInvoiceItem`),
  INDEX `invoice_items_pidInvoice_idx`(`pidInvoice`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_payments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidInvoicePayment` VARCHAR(191) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `pidUser` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `currency` VARCHAR(191) NOT NULL DEFAULT 'NGN',
  `paymentMethod` VARCHAR(191) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `note` LONGTEXT NULL,
  `paidAt` DATETIME(3) NOT NULL,
  `recordedByPidUser` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `invoice_payments_pidInvoicePayment_key`(`pidInvoicePayment`),
  INDEX `invoice_payments_pidInvoice_idx`(`pidInvoice`),
  INDEX `invoice_payments_pidUser_idx`(`pidUser`),
  INDEX `invoice_payments_paidAt_idx`(`paidAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `receipts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidReceipt` VARCHAR(191) NOT NULL,
  `receiptNumber` VARCHAR(191) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `pidInvoicePayment` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(18, 2) NOT NULL,
  `balanceAfter` DECIMAL(18, 2) NOT NULL,
  `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `deliveryStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `sentAt` DATETIME(3) NULL,
  `createdByPidUser` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `receipts_pidReceipt_key`(`pidReceipt`),
  UNIQUE INDEX `receipts_receiptNumber_key`(`receiptNumber`),
  INDEX `receipts_pidInvoice_idx`(`pidInvoice`),
  INDEX `receipts_pidInvoicePayment_idx`(`pidInvoicePayment`),
  INDEX `receipts_issuedAt_idx`(`issuedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `invoice_audit_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidAuditLog` VARCHAR(191) NOT NULL,
  `pidInvoice` VARCHAR(191) NOT NULL,
  `pidUser` VARCHAR(191) NULL,
  `action` VARCHAR(191) NOT NULL,
  `oldStatus` VARCHAR(191) NULL,
  `newStatus` VARCHAR(191) NULL,
  `metadata` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `invoice_audit_logs_pidAuditLog_key`(`pidAuditLog`),
  INDEX `invoice_audit_logs_pidInvoice_idx`(`pidInvoice`),
  INDEX `invoice_audit_logs_pidUser_idx`(`pidUser`),
  INDEX `invoice_audit_logs_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_pidUser_fkey`
  FOREIGN KEY (`pidUser`) REFERENCES `users`(`pidUser`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoice_items`
  ADD CONSTRAINT `invoice_items_pidInvoice_fkey`
  FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `invoice_payments`
  ADD CONSTRAINT `invoice_payments_pidInvoice_fkey`
  FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_payments_pidUser_fkey`
  FOREIGN KEY (`pidUser`) REFERENCES `users`(`pidUser`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `receipts`
  ADD CONSTRAINT `receipts_pidInvoice_fkey`
  FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `receipts_pidInvoicePayment_fkey`
  FOREIGN KEY (`pidInvoicePayment`) REFERENCES `invoice_payments`(`pidInvoicePayment`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `invoice_audit_logs`
  ADD CONSTRAINT `invoice_audit_logs_pidInvoice_fkey`
  FOREIGN KEY (`pidInvoice`) REFERENCES `invoices`(`pidInvoice`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `invoice_audit_logs_pidUser_fkey`
  FOREIGN KEY (`pidUser`) REFERENCES `users`(`pidUser`)
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `invoice_settings` (
  `pidSetting`,
  `businessName`,
  `businessContactDetails`,
  `footerNotes`,
  `status`,
  `createdAt`,
  `updatedAt`
)
VALUES (
  'INV-SETTINGS-DEFAULT',
  'Sure Importers Limited',
  'Lagos, Nigeria: 5 Olutosin Ajayi Street, Ajao Estate, Lagos\nGuangzhou, China: 广州市白云区机场路111号建发广场3FB3-1.\nPhone: +234 803 764 9956, +234 806 458 3664\nwww.sureimpors.com',
  'Naira payments should be made to any of the following bank accounts:\n\nSure Importers Limited, 0766818624, Access Bank.\nSpreadit Limited, 1016797924, Zenith Bank\nSpreadit Company, 0074576134, Sterling Bank\nSure Importers Limited, 1309064618, Providus Bank\nSpreadit Limited, 0449334088, Guaranty Trust Bank\n\nIf in the United Kingdom, pay GBP to: Spreadit Sourcing Ltd, 30-54-66, 36650768, Lloyds Bank\n\nIf making part payment for any of our products or service, note that your final payment and the total amount you will pay will be determined by the prevailing exchange rate. This invoice amount is valid for today based on today''s exchange rate. Exchange rate is volatile and can change at any time.\n\n\nThank you for your patronage.',
  'ACTIVE',
  NOW(3),
  NOW(3)
);
