CREATE TABLE `admin_permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidPermission` VARCHAR(191) NOT NULL,
  `pidUser` VARCHAR(191) NOT NULL,
  `serviceKey` VARCHAR(100) NOT NULL,
  `canView` BOOLEAN NOT NULL DEFAULT true,
  `canEdit` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NULL,
  UNIQUE INDEX `admin_permissions_pidPermission_key`(`pidPermission`),
  UNIQUE INDEX `admin_permissions_pidUser_serviceKey_key`(`pidUser`, `serviceKey`),
  INDEX `admin_permissions_pidUser_idx`(`pidUser`),
  INDEX `admin_permissions_serviceKey_idx`(`serviceKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `admin_permissions`
  ADD CONSTRAINT `admin_permissions_pidUser_fkey`
  FOREIGN KEY (`pidUser`) REFERENCES `admin`(`pidUser`) ON DELETE CASCADE ON UPDATE CASCADE;
