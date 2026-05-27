ALTER TABLE `corporate_gift_request`
  ADD COLUMN IF NOT EXISTS `pidUser` VARCHAR(191) NULL;
