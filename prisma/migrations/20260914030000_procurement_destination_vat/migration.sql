ALTER TABLE exchange_rate ADD COLUMN procurementVatForeign VARCHAR(191) NOT NULL DEFAULT '20';
ALTER TABLE exchange_rate ADD COLUMN exGbpPerUsd VARCHAR(191) NULL;
UPDATE exchange_rate SET exGbpPerUsd = '0.75' WHERE id = 1 AND exGbpPerUsd IS NULL;
