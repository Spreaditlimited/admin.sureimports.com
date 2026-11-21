-- Private source amounts; public store.productPrice remains the current NGN amount.
CREATE TABLE IF NOT EXISTS `store_rmb_pricing` (
  `pidProduct` VARCHAR(191) NOT NULL,
  `supplierRmb` DECIMAL(14,2) NOT NULL,
  `markupRmb` DECIMAL(14,2) NOT NULL,
  `source` VARCHAR(191) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`pidProduct`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
