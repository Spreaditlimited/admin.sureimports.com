ALTER TABLE `intelligence_review_requests`
  ADD COLUMN IF NOT EXISTS `supplierAddress` VARCHAR(700) NULL AFTER `supplierContact`;
