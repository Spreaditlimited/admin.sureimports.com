-- CreateTable
CREATE TABLE `vehicle_models` (
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `category` VARCHAR(60) NOT NULL,
    `powertrain` VARCHAR(30) NOT NULL DEFAULT 'Electric',
    `description` TEXT NOT NULL,
    `images` JSON NOT NULL,
    `youtubeUrls` JSON NOT NULL,
    `variants` JSON NOT NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `updatedBy` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_orders` (
    `id` VARCHAR(50) NOT NULL,
    `pidUser` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(100) NOT NULL,
    `modelSlug` VARCHAR(100) NOT NULL,
    `variantId` VARCHAR(100) NOT NULL,
    `vehicleName` VARCHAR(240) NOT NULL,
    `quantity` INTEGER NOT NULL,
    `customerName` VARCHAR(160) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `whatsappConsent` BOOLEAN NOT NULL DEFAULT false,
    `destination` VARCHAR(500) NOT NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(40) NOT NULL DEFAULT 'ENQUIRY',
    `priceSnapshot` JSON NULL,
    `pidInvoice` VARCHAR(191) NULL,
    `quoteExpiresAt` DATETIME(3) NULL,
    `eta` VARCHAR(160) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicle_orders_requestKey_key`(`requestKey`),
    UNIQUE INDEX `vehicle_orders_pidInvoice_key`(`pidInvoice`),
    INDEX `vehicle_orders_pidUser_createdAt_idx`(`pidUser`, `createdAt`),
    INDEX `vehicle_orders_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_events` (
    `id` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `message` TEXT NOT NULL,
    `actor` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vehicle_events_orderId_createdAt_idx`(`orderId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_payment_proofs` (
    `id` VARCHAR(50) NOT NULL,
    `orderId` VARCHAR(50) NOT NULL,
    `claimId` VARCHAR(191) NOT NULL,
    `requestKey` VARCHAR(100) NOT NULL,
    `filename` VARCHAR(100) NOT NULL,
    `mime` VARCHAR(60) NOT NULL,
    `content` LONGBLOB NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicle_payment_proofs_claimId_key`(`claimId`),
    UNIQUE INDEX `vehicle_payment_proofs_requestKey_key`(`requestKey`),
    INDEX `vehicle_payment_proofs_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_notifications` (
    `id` VARCHAR(50) NOT NULL,
    `eventId` VARCHAR(50) NOT NULL,
    `channel` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leaseUntil` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `sentAt` DATETIME(3) NULL,

    INDEX `vehicle_notifications_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    UNIQUE INDEX `vehicle_notifications_eventId_channel_key`(`eventId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vehicle_events` ADD CONSTRAINT `vehicle_events_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `vehicle_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_payment_proofs` ADD CONSTRAINT `vehicle_payment_proofs_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `vehicle_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_notifications` ADD CONSTRAINT `vehicle_notifications_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `vehicle_events`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

