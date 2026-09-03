ALTER TABLE `orders`
  ADD COLUMN `mergedIntoOrderId` VARCHAR(191) NULL,
  ADD COLUMN `mergedAt` DATETIME(3) NULL,
  ADD COLUMN `assistanceRevision` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `procurement_assistance_cases` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidCase` VARCHAR(80) NOT NULL,
  `pidUser` VARCHAR(191) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `supportNote` TEXT NULL,
  `canCreateOrder` BOOLEAN NOT NULL DEFAULT false,
  `canEditOrder` BOOLEAN NOT NULL DEFAULT true,
  `canManageProducts` BOOLEAN NOT NULL DEFAULT true,
  `canMergeOrders` BOOLEAN NOT NULL DEFAULT false,
  `consentVersion` VARCHAR(40) NOT NULL DEFAULT '2026-09-03',
  `assignedAdminPidUser` VARCHAR(191) NULL,
  `assignedAdminName` VARCHAR(191) NULL,
  `authorizedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  `claimedAt` DATETIME(3) NULL,
  `revokedAt` DATETIME(3) NULL,
  `releasedAt` DATETIME(3) NULL,
  `resolutionNote` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `procurement_assistance_cases_pidCase_key` (`pidCase`),
  INDEX `procurement_assistance_cases_pidUser_status_idx` (`pidUser`, `status`),
  INDEX `procurement_assistance_cases_status_expiresAt_idx` (`status`, `expiresAt`),
  INDEX `procurement_assistance_cases_assignedAdminPidUser_status_idx` (`assignedAdminPidUser`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_assistance_case_orders` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidCase` VARCHAR(80) NOT NULL,
  `pidOrder` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `procurement_assistance_case_orders_pidCase_pidOrder_key` (`pidCase`, `pidOrder`),
  INDEX `procurement_assistance_case_orders_pidOrder_idx` (`pidOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_assistance_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidEvent` VARCHAR(80) NOT NULL,
  `pidCase` VARCHAR(80) NOT NULL,
  `pidOrder` VARCHAR(191) NULL,
  `actorType` VARCHAR(20) NOT NULL,
  `actorPid` VARCHAR(191) NOT NULL,
  `eventType` VARCHAR(60) NOT NULL,
  `detailsJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `procurement_assistance_events_pidEvent_key` (`pidEvent`),
  INDEX `procurement_assistance_events_pidCase_createdAt_idx` (`pidCase`, `createdAt`),
  INDEX `procurement_assistance_events_pidOrder_createdAt_idx` (`pidOrder`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_order_merges` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidMerge` VARCHAR(80) NOT NULL,
  `pidUser` VARCHAR(191) NOT NULL,
  `targetOrderId` VARCHAR(191) NOT NULL,
  `actorType` VARCHAR(20) NOT NULL,
  `actorPid` VARCHAR(191) NOT NULL,
  `assistanceCaseId` VARCHAR(80) NULL,
  `idempotencyKey` VARCHAR(100) NOT NULL,
  `movedProductCount` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `procurement_order_merges_pidMerge_key` (`pidMerge`),
  UNIQUE INDEX `procurement_order_merges_idempotencyKey_key` (`idempotencyKey`),
  INDEX `procurement_order_merges_pidUser_createdAt_idx` (`pidUser`, `createdAt`),
  INDEX `procurement_order_merges_targetOrderId_idx` (`targetOrderId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `procurement_order_merge_sources` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidMerge` VARCHAR(80) NOT NULL,
  `sourceOrderId` VARCHAR(191) NOT NULL,
  `productCount` INTEGER NOT NULL DEFAULT 0,
  `snapshotJson` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `procurement_order_merge_sources_sourceOrderId_key` (`sourceOrderId`),
  INDEX `procurement_order_merge_sources_pidMerge_idx` (`pidMerge`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
