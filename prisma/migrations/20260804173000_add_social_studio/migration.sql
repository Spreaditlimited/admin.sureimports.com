CREATE TABLE `social_campaign` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidCampaign` VARCHAR(80) NOT NULL,
  `sourceType` VARCHAR(40) NOT NULL,
  `sourceRef` VARCHAR(500) NULL,
  `sourceTitle` VARCHAR(500) NULL,
  `contentPillar` VARCHAR(80) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'draft',
  `headline` VARCHAR(255) NOT NULL,
  `accentPhrase` VARCHAR(120) NULL,
  `subtext` VARCHAR(500) NOT NULL,
  `actionLabel` VARCHAR(255) NOT NULL,
  `instagramCaption` LONGTEXT NOT NULL,
  `facebookCaption` LONGTEXT NOT NULL,
  `imagePrompt` LONGTEXT NOT NULL,
  `demandRationale` TEXT NULL,
  `includeWhatsapp` BOOLEAN NOT NULL DEFAULT false,
  `backgroundImageUrl` TEXT NULL,
  `backgroundPublicId` VARCHAR(500) NULL,
  `designImageUrl` TEXT NULL,
  `designPublicId` VARCHAR(500) NULL,
  `scheduledFor` DATETIME(3) NULL,
  `approvedAt` DATETIME(3) NULL,
  `approvedBy` VARCHAR(100) NULL,
  `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `publishedAt` DATETIME(3) NULL,
  `lastError` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `social_campaign_pidCampaign_key`(`pidCampaign`),
  INDEX `social_campaign_status_scheduledFor_idx`(`status`, `scheduledFor`),
  INDEX `social_campaign_sourceType_idx`(`sourceType`),
  INDEX `social_campaign_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `social_publication` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidPublication` VARCHAR(80) NOT NULL,
  `pidCampaign` VARCHAR(80) NOT NULL,
  `platform` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'pending',
  `externalId` VARCHAR(255) NULL,
  `externalUrl` TEXT NULL,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` TEXT NULL,
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `social_publication_pidPublication_key`(`pidPublication`),
  UNIQUE INDEX `social_publication_pidCampaign_platform_key`(`pidCampaign`, `platform`),
  INDEX `social_publication_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `social_connection` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `platform` VARCHAR(40) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'active',
  `accountName` VARCHAR(255) NULL,
  `accountId` VARCHAR(255) NULL,
  `pageId` VARCHAR(255) NULL,
  `instagramUserId` VARCHAR(255) NULL,
  `instagramUsername` VARCHAR(255) NULL,
  `encryptedAccessToken` LONGTEXT NOT NULL,
  `tokenExpiresAt` DATETIME(3) NULL,
  `connectedBy` VARCHAR(100) NULL,
  `lastVerifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `social_connection_platform_key`(`platform`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `social_publication`
  ADD CONSTRAINT `social_publication_pidCampaign_fkey`
  FOREIGN KEY (`pidCampaign`) REFERENCES `social_campaign`(`pidCampaign`)
  ON DELETE CASCADE ON UPDATE CASCADE;
