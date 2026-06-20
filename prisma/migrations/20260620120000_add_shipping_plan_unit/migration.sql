ALTER TABLE `shippingplan`
ADD COLUMN `shippingPlanUnit` VARCHAR(191) NULL DEFAULT 'KG';

UPDATE `shippingplan`
SET `shippingPlanUnit` = 'KG'
WHERE `shippingPlanUnit` IS NULL OR `shippingPlanUnit` = '';
