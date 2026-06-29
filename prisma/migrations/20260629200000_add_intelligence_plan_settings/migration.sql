CREATE TABLE IF NOT EXISTS `intelligence_plan_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidSetting` VARCHAR(80) NOT NULL,
  `planKey` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `priceNaira` INT NOT NULL,
  `paystackPlanCode` VARCHAR(160) NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `intelligence_plan_settings_pid_key`(`pidSetting`),
  UNIQUE INDEX `intelligence_plan_settings_plan_key`(`planKey`),
  INDEX `intelligence_plan_settings_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
