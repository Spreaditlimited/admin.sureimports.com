DROP TABLE IF EXISTS `shipping_tracking_events`;
DROP TABLE IF EXISTS `shipping_tracking_stages`;

ALTER TABLE `shipping_only`
  DROP FOREIGN KEY `shipping_only_trackingRouteId_fkey`;

ALTER TABLE `shipping_only`
  DROP INDEX `shipping_only_trackingRouteId_idx`,
  DROP COLUMN `currentTrackingStage`,
  DROP COLUMN `trackingRouteId`;

DROP TABLE IF EXISTS `shipping_tracking_routes`;
