ALTER TABLE `shipping_only`
  ADD COLUMN `trackingRouteId` VARCHAR(191) NULL,
  ADD COLUMN `currentTrackingStage` VARCHAR(191) NULL,
  ADD INDEX `shipping_only_trackingRouteId_idx` (`trackingRouteId`);

CREATE TABLE `shipping_tracking_routes` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidRoute` VARCHAR(191) NOT NULL,
  `routeName` VARCHAR(191) NOT NULL,
  `originCountry` VARCHAR(191) NOT NULL,
  `destinationCountry` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `shipping_tracking_routes_pidRoute_key` (`pidRoute`),
  UNIQUE INDEX `shipping_tracking_routes_originCountry_destinationCountry_key` (`originCountry`, `destinationCountry`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shipping_tracking_stages` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidStage` VARCHAR(191) NOT NULL,
  `routeId` VARCHAR(191) NOT NULL,
  `stageKey` VARCHAR(191) NOT NULL,
  `stageLabel` VARCHAR(191) NOT NULL,
  `displayOrder` INTEGER NOT NULL,
  `emailEnabled` BOOLEAN NOT NULL DEFAULT false,
  `paymentPrompt` BOOLEAN NOT NULL DEFAULT false,
  `notificationMessage` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `shipping_tracking_stages_pidStage_key` (`pidStage`),
  UNIQUE INDEX `shipping_tracking_stages_routeId_stageKey_key` (`routeId`, `stageKey`),
  UNIQUE INDEX `shipping_tracking_stages_routeId_displayOrder_key` (`routeId`, `displayOrder`),
  INDEX `shipping_tracking_stages_routeId_idx` (`routeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `shipping_tracking_events` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `pidEvent` VARCHAR(191) NOT NULL,
  `pidShippingOnly` VARCHAR(191) NOT NULL,
  `stageKey` VARCHAR(191) NOT NULL,
  `stageLabel` VARCHAR(191) NOT NULL,
  `publicNote` TEXT NULL,
  `location` VARCHAR(191) NULL,
  `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdByPidUser` VARCHAR(191) NULL,
  `notificationSent` BOOLEAN NOT NULL DEFAULT false,
  `notificationError` TEXT NULL,
  UNIQUE INDEX `shipping_tracking_events_pidEvent_key` (`pidEvent`),
  INDEX `shipping_tracking_events_pidShippingOnly_occurredAt_idx` (`pidShippingOnly`, `occurredAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `shipping_only`
  ADD CONSTRAINT `shipping_only_trackingRouteId_fkey`
  FOREIGN KEY (`trackingRouteId`) REFERENCES `shipping_tracking_routes`(`pidRoute`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `shipping_tracking_stages`
  ADD CONSTRAINT `shipping_tracking_stages_routeId_fkey`
  FOREIGN KEY (`routeId`) REFERENCES `shipping_tracking_routes`(`pidRoute`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `shipping_tracking_events`
  ADD CONSTRAINT `shipping_tracking_events_pidShippingOnly_fkey`
  FOREIGN KEY (`pidShippingOnly`) REFERENCES `shipping_only`(`pidShippingOnly`)
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO `shipping_tracking_routes`
  (`pidRoute`, `routeName`, `originCountry`, `destinationCountry`, `status`, `createdAt`, `updatedAt`)
VALUES
  ('STR_CHINA_NIGERIA', 'China to Nigeria', 'China', 'Nigeria', 'ACTIVE', NOW(3), NOW(3));

INSERT INTO `shipping_tracking_stages`
  (`pidStage`, `routeId`, `stageKey`, `stageLabel`, `displayOrder`, `emailEnabled`, `paymentPrompt`, `notificationMessage`, `createdAt`, `updatedAt`)
VALUES
  ('STS_CN_NG_01', 'STR_CHINA_NIGERIA', 'in-china-warehouse', 'In China Warehouse', 1, false, false, NULL, NOW(3), NOW(3)),
  ('STS_CN_NG_02', 'STR_CHINA_NIGERIA', 'container-loaded', 'Container Loaded', 2, false, false, NULL, NOW(3), NOW(3)),
  ('STS_CN_NG_03', 'STR_CHINA_NIGERIA', 'shipped', 'Shipped', 3, false, false, NULL, NOW(3), NOW(3)),
  ('STS_CN_NG_04', 'STR_CHINA_NIGERIA', 'arrived-port', 'Arrived Port', 4, false, false, NULL, NOW(3), NOW(3)),
  ('STS_CN_NG_05', 'STR_CHINA_NIGERIA', 'being-cleared', 'Being Cleared', 5, false, false, NULL, NOW(3), NOW(3)),
  ('STS_CN_NG_06', 'STR_CHINA_NIGERIA', 'cleared', 'Cleared', 6, false, false, NULL, NOW(3), NOW(3)),
  ('STS_CN_NG_07', 'STR_CHINA_NIGERIA', 'ready-for-collection', 'Ready for Collection', 7, true, true,
   'Your shipment is ready for collection. Please make your shipping payment to complete collection arrangements.',
   NOW(3), NOW(3));

UPDATE `shipping_only` AS shipment
LEFT JOIN `country` AS destination
  ON destination.`pidCountry` = shipment.`shippingTo`
  OR destination.`countrySlug` = shipment.`shippingTo`
  OR destination.`countryName` = shipment.`shippingTo`
SET shipment.`trackingRouteId` = 'STR_CHINA_NIGERIA'
WHERE LOWER(TRIM(COALESCE(destination.`countryName`, shipment.`shippingTo`, ''))) = 'nigeria';
