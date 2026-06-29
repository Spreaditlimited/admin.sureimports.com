CREATE TABLE IF NOT EXISTS `intelligence_research_jobs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidJob` VARCHAR(80) NOT NULL,
  `nicheName` VARCHAR(180) NOT NULL,
  `targetSupplierCount` INT NOT NULL DEFAULT 3,
  `status` VARCHAR(40) NOT NULL DEFAULT 'draft',
  `requestNotes` LONGTEXT NULL,
  `draftJson` LONGTEXT NULL,
  `errorMessage` LONGTEXT NULL,
  `createdByPidUser` VARCHAR(191) NULL,
  `approvedByPidUser` VARCHAR(191) NULL,
  `approvedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `intelligence_research_jobs_pidJob_key` (`pidJob`),
  KEY `intelligence_research_jobs_status_idx` (`status`),
  KEY `intelligence_research_jobs_nicheName_idx` (`nicheName`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
