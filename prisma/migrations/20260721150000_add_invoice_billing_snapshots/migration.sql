ALTER TABLE `invoices`
  ADD COLUMN `customerBusinessName` VARCHAR(191) NULL AFTER `customerName`,
  ADD COLUMN `customerContactName` VARCHAR(191) NULL AFTER `customerBusinessName`,
  ADD COLUMN `customerAddress` LONGTEXT NULL AFTER `customerPhone`,
  ADD COLUMN `customerNotes` LONGTEXT NULL AFTER `footerSnapshot`;

