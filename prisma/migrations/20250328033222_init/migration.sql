-- AlterTable
ALTER TABLE `orders` ADD COLUMN `additionalCost` VARCHAR(191) NULL,
    ADD COLUMN `additionalCostDescription` VARCHAR(191) NULL,
    ADD COLUMN `trackingCompany` VARCHAR(191) NULL,
    ADD COLUMN `trackingLink` VARCHAR(191) NULL,
    ADD COLUMN `trackingNumber` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `store` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pidProduct` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NULL,
    `productSlug` VARCHAR(191) NULL,
    `productCategory` VARCHAR(191) NULL,
    `productBrand` VARCHAR(191) NULL,
    `productPrice` DOUBLE NULL,
    `productMOQ` DOUBLE NULL,
    `productDescription` VARCHAR(191) NULL,
    `productFeature` VARCHAR(191) NULL,
    `productSpecification` VARCHAR(191) NULL,
    `productVisibility` BOOLEAN NULL,
    `productStatus` VARCHAR(191) NULL,
    `productImage` VARCHAR(191) NULL,
    `productImageType` VARCHAR(191) NULL,
    `productImageExt` VARCHAR(191) NULL,
    `ext1` VARCHAR(191) NULL,
    `ext2` VARCHAR(191) NULL,
    `xStatus` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,

    UNIQUE INDEX `store_pidProduct_key`(`pidProduct`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
