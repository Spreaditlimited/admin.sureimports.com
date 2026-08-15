ALTER TABLE `marketing_contacts`
  ADD COLUMN `optInTokenHash` CHAR(64) NULL,
  ADD COLUMN `optInRequestedAt` DATETIME(3) NULL,
  ADD COLUMN `optInExpiresAt` DATETIME(3) NULL,
  ADD UNIQUE INDEX `marketing_contacts_optInTokenHash_key` (`optInTokenHash`);
