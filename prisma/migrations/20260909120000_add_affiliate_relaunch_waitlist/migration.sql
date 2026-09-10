CREATE TABLE `affiliate_waitlist_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidWaitlist` VARCHAR(80) NOT NULL,
    `emailHash` CHAR(64) NOT NULL,
    `nameCiphertext` TEXT NOT NULL,
    `emailCiphertext` TEXT NOT NULL,
    `phoneCiphertext` TEXT NOT NULL,
    `country` VARCHAR(100) NOT NULL,
    `ipHash` CHAR(64) NULL,
    `consentVersion` VARCHAR(80) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'WAITING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `affiliate_waitlist_entries_pidWaitlist_key`(`pidWaitlist`),
    UNIQUE INDEX `affiliate_waitlist_entries_emailHash_key`(`emailHash`),
    INDEX `affiliate_waitlist_entries_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `affiliate_waitlist_entries_ipHash_createdAt_idx`(`ipHash`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
