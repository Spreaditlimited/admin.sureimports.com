CREATE TABLE `marketing_contacts` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidContact` VARCHAR(80) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `firstName` VARCHAR(100) NULL,
  `lastName` VARCHAR(100) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `consentStatus` VARCHAR(40) NOT NULL DEFAULT 'OPTED_IN',
  `consentSource` VARCHAR(120) NULL,
  `consentContext` JSON NULL,
  `consentAt` DATETIME(3) NULL,
  `unsubscribedAt` DATETIME(3) NULL,
  `bouncedAt` DATETIME(3) NULL,
  `complainedAt` DATETIME(3) NULL,
  `sesVerificationStatus` VARCHAR(40) NOT NULL DEFAULT 'UNVERIFIED',
  `sesContactSyncedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `marketing_contacts_pidContact_key`(`pidContact`),
  UNIQUE INDEX `marketing_contacts_email_key`(`email`),
  INDEX `marketing_contacts_status_idx`(`status`),
  INDEX `marketing_contacts_consentStatus_idx`(`consentStatus`),
  INDEX `marketing_contacts_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketing_sequences` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidSequence` VARCHAR(80) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `triggerKey` VARCHAR(100) NULL,
  `cadence` VARCHAR(40) NOT NULL DEFAULT 'WEEKLY',
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `totalSteps` INTEGER NOT NULL DEFAULT 0,
  `createdBy` VARCHAR(80) NULL,
  `activatedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `marketing_sequences_pidSequence_key`(`pidSequence`),
  INDEX `marketing_sequences_status_idx`(`status`),
  INDEX `marketing_sequences_triggerKey_idx`(`triggerKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketing_sequence_steps` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidStep` VARCHAR(80) NOT NULL,
  `sequenceId` INTEGER NOT NULL,
  `stepNumber` INTEGER NOT NULL,
  `delayDays` INTEGER NOT NULL DEFAULT 0,
  `title` VARCHAR(200) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `previewText` VARCHAR(500) NULL,
  `bodyText` LONGTEXT NOT NULL,
  `ctaLabel` VARCHAR(255) NULL,
  `ctaUrl` VARCHAR(1000) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `marketing_sequence_steps_pidStep_key`(`pidStep`),
  UNIQUE INDEX `marketing_sequence_steps_sequenceId_stepNumber_key`(`sequenceId`, `stepNumber`),
  INDEX `marketing_sequence_steps_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketing_enrollments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidEnrollment` VARCHAR(80) NOT NULL,
  `contactId` INTEGER NOT NULL,
  `sequenceId` INTEGER NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `currentStep` INTEGER NOT NULL DEFAULT 0,
  `nextSendAt` DATETIME(3) NULL,
  `enrolledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSentAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `marketing_enrollments_pidEnrollment_key`(`pidEnrollment`),
  UNIQUE INDEX `marketing_enrollments_contactId_sequenceId_key`(`contactId`, `sequenceId`),
  INDEX `marketing_enrollments_status_nextSendAt_idx`(`status`, `nextSendAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketing_campaigns` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidCampaign` VARCHAR(80) NOT NULL,
  `name` VARCHAR(180) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `previewText` VARCHAR(500) NULL,
  `bodyText` LONGTEXT NOT NULL,
  `ctaLabel` VARCHAR(255) NULL,
  `ctaUrl` VARCHAR(1000) NULL,
  `audienceType` VARCHAR(40) NOT NULL DEFAULT 'TEST',
  `status` VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  `scheduledAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `createdBy` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `marketing_campaigns_pidCampaign_key`(`pidCampaign`),
  INDEX `marketing_campaigns_status_scheduledAt_idx`(`status`, `scheduledAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketing_deliveries` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidDelivery` VARCHAR(80) NOT NULL,
  `contactId` INTEGER NULL,
  `campaignId` INTEGER NULL,
  `sequenceStepId` INTEGER NULL,
  `enrollmentId` INTEGER NULL,
  `provider` VARCHAR(40) NOT NULL DEFAULT 'SES',
  `mode` VARCHAR(40) NOT NULL DEFAULT 'SANDBOX',
  `status` VARCHAR(40) NOT NULL DEFAULT 'QUEUED',
  `recipientEmail` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `sesMessageId` VARCHAR(255) NULL,
  `errorMessage` TEXT NULL,
  `scheduledAt` DATETIME(3) NULL,
  `attemptedAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `deliveredAt` DATETIME(3) NULL,
  `bouncedAt` DATETIME(3) NULL,
  `complainedAt` DATETIME(3) NULL,
  `openedAt` DATETIME(3) NULL,
  `clickedAt` DATETIME(3) NULL,
  `unsubscribedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `marketing_deliveries_pidDelivery_key`(`pidDelivery`),
  UNIQUE INDEX `marketing_deliveries_idempotencyKey_key`(`idempotencyKey`),
  UNIQUE INDEX `marketing_deliveries_sesMessageId_key`(`sesMessageId`),
  INDEX `marketing_deliveries_status_scheduledAt_idx`(`status`, `scheduledAt`),
  INDEX `marketing_deliveries_recipientEmail_idx`(`recipientEmail`),
  INDEX `marketing_deliveries_campaignId_idx`(`campaignId`),
  INDEX `marketing_deliveries_sequenceStepId_idx`(`sequenceStepId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `marketing_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidEvent` VARCHAR(80) NOT NULL,
  `dedupeKey` VARCHAR(191) NOT NULL,
  `deliveryId` INTEGER NULL,
  `sesMessageId` VARCHAR(255) NULL,
  `eventType` VARCHAR(60) NOT NULL,
  `payload` JSON NOT NULL,
  `occurredAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `marketing_events_pidEvent_key`(`pidEvent`),
  UNIQUE INDEX `marketing_events_dedupeKey_key`(`dedupeKey`),
  INDEX `marketing_events_eventType_occurredAt_idx`(`eventType`, `occurredAt`),
  INDEX `marketing_events_sesMessageId_idx`(`sesMessageId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `marketing_sequence_steps`
  ADD CONSTRAINT `marketing_sequence_steps_sequenceId_fkey`
  FOREIGN KEY (`sequenceId`) REFERENCES `marketing_sequences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `marketing_enrollments`
  ADD CONSTRAINT `marketing_enrollments_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `marketing_contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `marketing_enrollments_sequenceId_fkey`
  FOREIGN KEY (`sequenceId`) REFERENCES `marketing_sequences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `marketing_deliveries`
  ADD CONSTRAINT `marketing_deliveries_contactId_fkey`
  FOREIGN KEY (`contactId`) REFERENCES `marketing_contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `marketing_deliveries_campaignId_fkey`
  FOREIGN KEY (`campaignId`) REFERENCES `marketing_campaigns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `marketing_deliveries_sequenceStepId_fkey`
  FOREIGN KEY (`sequenceStepId`) REFERENCES `marketing_sequence_steps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `marketing_deliveries_enrollmentId_fkey`
  FOREIGN KEY (`enrollmentId`) REFERENCES `marketing_enrollments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `marketing_events`
  ADD CONSTRAINT `marketing_events_deliveryId_fkey`
  FOREIGN KEY (`deliveryId`) REFERENCES `marketing_deliveries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

