CREATE TABLE IF NOT EXISTS `company_contact_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidSetting` VARCHAR(191) NOT NULL,
  `chinaAddress` LONGTEXT NOT NULL,
  `chinaContact` VARCHAR(500) NOT NULL,
  `lagosAddress` LONGTEXT NOT NULL,
  `lagosContact` VARCHAR(500) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY `company_contact_settings_pidSetting_key` (`pidSetting`),
  KEY `company_contact_settings_status_idx` (`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `company_contact_settings` (
  `pidSetting`,
  `chinaAddress`,
  `chinaContact`,
  `lagosAddress`,
  `lagosContact`,
  `status`
)
SELECT
  'COMPANY-CONTACTS-ACTIVE',
  'China: 广州市白云区机场路111号建发广场3FB3-1.',
  '+8619576837849',
  '5 Olutosin Ajayi Street, Ajao Estate, Lagos, Nigeria',
  '+234 803 764 9956, +234 806 458 3664',
  'ACTIVE'
WHERE NOT EXISTS (
  SELECT 1 FROM `company_contact_settings` WHERE `status` = 'ACTIVE'
);
