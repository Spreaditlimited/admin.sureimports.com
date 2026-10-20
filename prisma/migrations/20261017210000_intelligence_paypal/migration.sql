CREATE TABLE IF NOT EXISTS intelligence_usd_pricing (
  planKey VARCHAR(40) NOT NULL PRIMARY KEY,
  priceUsdCents INT NOT NULL DEFAULT 0,
  extraCreditPriceUsdCents INT NOT NULL DEFAULT 0,
  revision INT NOT NULL DEFAULT 0,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
INSERT IGNORE INTO intelligence_usd_pricing (planKey) VALUES ('starter'), ('pro');
CREATE TABLE IF NOT EXISTS intelligence_paypal_plans (
  cacheKey VARCHAR(80) NOT NULL PRIMARY KEY,
  providerPlanId VARCHAR(80) NOT NULL,
  environment VARCHAR(10) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
CREATE TABLE IF NOT EXISTS intelligence_paypal_checkouts (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  pidUser VARCHAR(191) NOT NULL,
  pidSubscription VARCHAR(80) NULL,
  kind VARCHAR(20) NOT NULL,
  planKey VARCHAR(40) NOT NULL,
  providerReference VARCHAR(80) NULL,
  providerPlanId VARCHAR(80) NULL,
  environment VARCHAR(10) NOT NULL,
  amountMinor INT NOT NULL,
  credits INT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  approvalUrl TEXT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY intelligence_paypal_reference (environment, providerReference),
  KEY intelligence_paypal_customer (pidUser, kind, status)
);
CREATE TABLE IF NOT EXISTS intelligence_paypal_payments (
  paymentReference VARCHAR(120) NOT NULL PRIMARY KEY,
  checkoutId VARCHAR(80) NOT NULL,
  amountMinor INT NOT NULL,
  credits INT NOT NULL,
  status VARCHAR(40) NOT NULL,
  paidAt DATETIME(3) NOT NULL,
  periodEnd DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY intelligence_paypal_payment_checkout (checkoutId)
);
