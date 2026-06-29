ALTER TABLE `intelligence_suppliers`
  ADD COLUMN `productsMade` LONGTEXT NULL;

CREATE TABLE IF NOT EXISTS `intelligence_supplier_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidSupplierCategory` VARCHAR(80) NOT NULL,
  `supplierId` VARCHAR(80) NOT NULL,
  `nicheId` VARCHAR(80) NOT NULL,
  `source` VARCHAR(80) NOT NULL DEFAULT 'admin',
  `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NULL,
  UNIQUE INDEX `intelligence_supplier_categories_pid_key`(`pidSupplierCategory`),
  UNIQUE INDEX `intelligence_supplier_categories_supplier_niche_key`(`supplierId`, `nicheId`),
  INDEX `intelligence_supplier_categories_supplier_idx`(`supplierId`),
  INDEX `intelligence_supplier_categories_niche_idx`(`nicheId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
