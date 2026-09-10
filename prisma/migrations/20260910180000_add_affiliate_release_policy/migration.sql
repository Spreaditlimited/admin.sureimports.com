ALTER TABLE `affiliate_program_services`
  ADD COLUMN `approvalMode` VARCHAR(24) NOT NULL DEFAULT 'MANUAL' AFTER `recurring`,
  ADD COLUMN `reviewPeriodDays` INTEGER NOT NULL DEFAULT 14 AFTER `approvalMode`;
