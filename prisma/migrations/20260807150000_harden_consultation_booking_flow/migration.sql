ALTER TABLE `consultation_bookings`
  ADD COLUMN `paymentVerifiedAt` DATETIME(3) NULL,
  ADD COLUMN `customerEmailSentAt` DATETIME(3) NULL,
  ADD COLUMN `adminEmailSentAt` DATETIME(3) NULL,
  ADD COLUMN `fulfillmentError` LONGTEXT NULL,
  ADD COLUMN `lastReconciledAt` DATETIME(3) NULL,
  ADD COLUMN `calendarSequence` INT NOT NULL DEFAULT 0;
