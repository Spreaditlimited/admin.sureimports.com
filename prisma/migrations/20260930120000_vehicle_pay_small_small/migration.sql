CREATE TABLE `vehicle_plan_settings` (
 `id` INT NOT NULL PRIMARY KEY, `enabled` BOOLEAN NOT NULL DEFAULT false,
 `depositPercent` DECIMAL(5,2) NOT NULL DEFAULT 30, `feePercent` DECIMAL(5,2) NOT NULL DEFAULT 5,
 `durationDays` INT NOT NULL DEFAULT 90, `revision` INT NOT NULL DEFAULT 1,
 `updatedBy` VARCHAR(191) NULL, `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT INTO vehicle_plan_settings (id) VALUES (1);
CREATE TABLE `vehicle_payment_plans` (
 `orderId` VARCHAR(50) NOT NULL PRIMARY KEY, `status` VARCHAR(40) NOT NULL DEFAULT 'REQUESTED',
 `terms` JSON NULL, `acceptedAt` DATETIME(3) NULL, `activatedAt` DATETIME(3) NULL, `expiresAt` DATETIME(3) NULL,
 `cancellationReason` TEXT NULL, `previousStatus` VARCHAR(40) NULL,
 `refundProposedBy` VARCHAR(191) NULL, `refundMinor` BIGINT NULL, `refundAccount` VARCHAR(1000) NULL,
 `refundReference` VARCHAR(191) NULL UNIQUE, `refundedBy` VARCHAR(191) NULL, `refundedAt` DATETIME(3) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX `vehicle_plan_status` (`status`,`updatedAt`),
 CONSTRAINT `vehicle_plan_order` FOREIGN KEY (`orderId`) REFERENCES `vehicle_orders` (`id`) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `vehicle_bank_credits` (
 `id` VARCHAR(50) NOT NULL PRIMARY KEY, `claimId` VARCHAR(191) NOT NULL UNIQUE,
 `orderId` VARCHAR(50) NOT NULL, `bankAccountId` VARCHAR(191) NOT NULL,
 `creditKey` CHAR(64) NOT NULL UNIQUE, `bankReference` VARCHAR(191) NOT NULL,
 `amountMinor` BIGINT NOT NULL, `creditedAt` DATETIME(3) NOT NULL,
 `verifiedBy` VARCHAR(191) NOT NULL, `verifiedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE KEY `vehicle_credit_account_reference` (`bankAccountId`,`bankReference`),
 INDEX `vehicle_credit_order` (`orderId`,`creditedAt`),
 CONSTRAINT `vehicle_credit_order_fk` FOREIGN KEY (`orderId`) REFERENCES `vehicle_orders` (`id`) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `vehicle_plan_reminders` (
 `reminderKey` VARCHAR(191) NOT NULL PRIMARY KEY, `orderId` VARCHAR(50) NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 CONSTRAINT `vehicle_reminder_order` FOREIGN KEY (`orderId`) REFERENCES `vehicle_orders` (`id`) ON DELETE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `vehicle_plan_settings_audit` (
 `id` VARCHAR(50) NOT NULL PRIMARY KEY, `revision` INT NOT NULL UNIQUE,
 `settings` JSON NOT NULL, `actor` VARCHAR(191) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `vehicle_credit_reversals` (
 `claimId` VARCHAR(191) NOT NULL PRIMARY KEY, `orderId` VARCHAR(50) NOT NULL,
 `status` VARCHAR(20) NOT NULL DEFAULT 'REQUESTED', `reason` TEXT NOT NULL,
 `proposedBy` VARCHAR(191) NOT NULL, `confirmedBy` VARCHAR(191) NULL,
 `bankReference` VARCHAR(191) NULL UNIQUE, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 `confirmedAt` DATETIME(3) NULL,
 INDEX `vehicle_reversal_order` (`orderId`,`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
