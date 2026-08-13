ALTER TABLE `quotation_builder_documents`
  ADD COLUMN `pidUser` VARCHAR(191) NULL,
  ADD COLUMN `lastSentAt` DATETIME(3) NULL,
  ADD COLUMN `lastSentByPidUser` VARCHAR(80) NULL,
  ADD COLUMN `sendCount` INTEGER NOT NULL DEFAULT 0;

ALTER TABLE `invoices`
  ADD COLUMN `pidQuotation` VARCHAR(80) NULL;

CREATE INDEX `quotation_builder_documents_pidUser_idx`
  ON `quotation_builder_documents`(`pidUser`);

CREATE INDEX `invoices_pidQuotation_idx`
  ON `invoices`(`pidQuotation`);

ALTER TABLE `invoices`
  ADD CONSTRAINT `invoices_pidQuotation_fkey`
  FOREIGN KEY (`pidQuotation`) REFERENCES `quotation_builder_documents`(`pidQuotation`)
  ON DELETE SET NULL ON UPDATE CASCADE;
