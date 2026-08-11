ALTER TABLE `exchange_rate`
ADD COLUMN `quotationSeaRateNgnPerCbm` VARCHAR(191) NULL DEFAULT '500000';

UPDATE `exchange_rate`
SET `quotationSeaRateNgnPerCbm` = '500000'
WHERE `id` = 1
  AND (`quotationSeaRateNgnPerCbm` IS NULL OR `quotationSeaRateNgnPerCbm` = '');

CREATE TABLE `quotation_builder_documents` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidQuotation` VARCHAR(80) NOT NULL,
  `quotationNumber` VARCHAR(100) NOT NULL,
  `customerName` VARCHAR(220) NOT NULL,
  `customerLocation` VARCHAR(255) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `sourceFiles` JSON NOT NULL,
  `extractedData` JSON NULL,
  `quoteData` JSON NOT NULL,
  `rateSnapshot` JSON NOT NULL,
  `maxPages` INTEGER NOT NULL DEFAULT 2,
  `pdfUrl` VARCHAR(1000) NULL,
  `pdfPublicId` VARCHAR(500) NULL,
  `pdfBytes` INTEGER NULL,
  `createdByPidUser` VARCHAR(80) NULL,
  `updatedByPidUser` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `quotation_builder_documents_pidQuotation_key`(`pidQuotation`),
  UNIQUE INDEX `quotation_builder_documents_quotationNumber_key`(`quotationNumber`),
  INDEX `quotation_builder_documents_status_idx`(`status`),
  INDEX `quotation_builder_documents_createdAt_idx`(`createdAt`),
  INDEX `quotation_builder_documents_customerName_idx`(`customerName`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
