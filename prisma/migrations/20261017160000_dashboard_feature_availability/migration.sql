CREATE TABLE IF NOT EXISTS `dashboard_feature_settings` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `rulesJson` LONGTEXT NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 0,
  `updatedBy` VARCHAR(191) NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
INSERT IGNORE INTO `dashboard_feature_settings` (`id`, `rulesJson`) VALUES
(1, '{"shop":true,"wallet":true,"instalments":true,"orders":true,"procurement":false,"shipping":false,"pay_supplier":false,"vehicles":false,"corporate_sourcing":false,"intelligence":false,"reports":false,"verification":false,"refunds":false,"invoices":false}');
