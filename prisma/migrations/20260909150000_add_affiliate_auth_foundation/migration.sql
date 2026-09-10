CREATE TABLE `affiliate_accounts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidAffiliate` VARCHAR(80) NOT NULL,
  `emailHash` CHAR(64) NOT NULL,
  `emailCiphertext` TEXT NOT NULL,
  `firstNameCiphertext` TEXT NOT NULL,
  `lastNameCiphertext` TEXT NOT NULL,
  `phoneCiphertext` TEXT NOT NULL,
  `country` VARCHAR(100) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `referralCode` VARCHAR(24) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `emailVerifiedAt` DATETIME(3) NULL,
  `termsAcceptedAt` DATETIME(3) NOT NULL,
  `consentVersion` VARCHAR(80) NOT NULL,
  `lastLoginAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_accounts_pidAffiliate_key`(`pidAffiliate`),
  UNIQUE INDEX `affiliate_accounts_emailHash_key`(`emailHash`),
  UNIQUE INDEX `affiliate_accounts_referralCode_key`(`referralCode`),
  INDEX `affiliate_accounts_status_createdAt_idx`(`status`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_sessions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidSession` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ipHash` CHAR(64) NULL,
  `userAgentHash` CHAR(64) NULL,
  `revokedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `affiliate_sessions_pidSession_key`(`pidSession`),
  UNIQUE INDEX `affiliate_sessions_tokenHash_key`(`tokenHash`),
  INDEX `affiliate_sessions_affiliateId_expiresAt_idx`(`affiliateId`, `expiresAt`),
  INDEX `affiliate_sessions_expiresAt_revokedAt_idx`(`expiresAt`, `revokedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_auth_tokens` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidToken` VARCHAR(80) NOT NULL,
  `affiliateId` INTEGER NOT NULL,
  `purpose` VARCHAR(32) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `consumedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `affiliate_auth_tokens_pidToken_key`(`pidToken`),
  UNIQUE INDEX `affiliate_auth_tokens_tokenHash_key`(`tokenHash`),
  INDEX `affiliate_auth_tokens_affiliateId_purpose_createdAt_idx`(`affiliateId`, `purpose`, `createdAt`),
  INDEX `affiliate_auth_tokens_expiresAt_consumedAt_idx`(`expiresAt`, `consumedAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `affiliate_auth_limits` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `keyHash` CHAR(64) NOT NULL,
  `action` VARCHAR(40) NOT NULL,
  `windowStarted` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `count` INTEGER NOT NULL DEFAULT 1,
  `blockedUntil` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `affiliate_auth_limits_keyHash_action_key`(`keyHash`, `action`),
  INDEX `affiliate_auth_limits_blockedUntil_idx`(`blockedUntil`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `affiliate_sessions` ADD CONSTRAINT `affiliate_sessions_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `affiliate_auth_tokens` ADD CONSTRAINT `affiliate_auth_tokens_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `affiliate_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
