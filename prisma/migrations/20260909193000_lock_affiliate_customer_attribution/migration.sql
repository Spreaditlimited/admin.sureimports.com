ALTER TABLE `affiliate_referrals`
  ADD COLUMN `customerReference` VARCHAR(191) NULL,
  ADD COLUMN `claimedAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `affiliate_referrals_customerReference_key` (`customerReference`);
