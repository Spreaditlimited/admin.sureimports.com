ALTER TABLE `products`
ADD COLUMN `shippingMeasurePerUnit` DOUBLE NULL;

ALTER TABLE `orders`
ADD COLUMN `shippingPricingVersion` INTEGER NULL,
ADD COLUMN `shippingMeasurementUnit` VARCHAR(191) NULL,
ADD COLUMN `shippingRateSnapshot` DOUBLE NULL,
ADD COLUMN `shippingRateCurrency` VARCHAR(191) NULL;
