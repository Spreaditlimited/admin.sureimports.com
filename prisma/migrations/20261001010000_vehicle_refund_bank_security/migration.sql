CREATE TABLE bank_profile_verifications (
 pidUser VARCHAR(191) NOT NULL PRIMARY KEY,
 fingerprint CHAR(64) NOT NULL,
 verifiedAt DATETIME(3) NOT NULL,
 method VARCHAR(40) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE vehicle_plan_settings
 ADD COLUMN refundBusinessDays INT NOT NULL DEFAULT 7,
 ADD COLUMN refundHolidays JSON NULL;
ALTER TABLE vehicle_payment_plans
 ADD COLUMN cancellationRequestedAt DATETIME(3) NULL,
 ADD COLUMN refundDueAt DATETIME(3) NULL,
 ADD COLUMN refundBusinessDays INT NULL,
 ADD COLUMN refundGrossMinor BIGINT NULL,
 ADD COLUMN refundFeeMinor BIGINT NULL,
 ADD COLUMN refundBankFingerprint CHAR(64) NULL;
