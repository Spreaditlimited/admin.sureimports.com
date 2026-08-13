ALTER TABLE `quotation_builder_documents`
  ADD COLUMN `linkedRequestId` VARCHAR(191) NULL;

CREATE INDEX `quotation_builder_documents_linkedRequestId_idx`
  ON `quotation_builder_documents`(`linkedRequestId`);
