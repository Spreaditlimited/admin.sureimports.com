CREATE TABLE IF NOT EXISTS consultation_paypal_checkouts (
  reference VARCHAR(140) NOT NULL PRIMARY KEY,
  pidBooking VARCHAR(80) NOT NULL,
  providerReference VARCHAR(80) NOT NULL,
  environment VARCHAR(10) NOT NULL,
  captureReference VARCHAR(80) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY consultation_paypal_order (environment,providerReference),
  UNIQUE KEY consultation_paypal_booking (pidBooking)
);
