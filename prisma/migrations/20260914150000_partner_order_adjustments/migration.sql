CREATE TABLE partner_order_adjustments (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  orderId VARCHAR(80) NOT NULL,
  revision INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'AWAITING_PARTNER',
  currency CHAR(3) NOT NULL,
  beforeJson LONGTEXT NOT NULL,
  afterJson LONGTEXT NOT NULL,
  deltaMinor BIGINT NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  proposedBy VARCHAR(191) NOT NULL,
  reviewedBy VARCHAR(191) NULL,
  reviewNote VARCHAR(2000) NULL,
  reviewedAt DATETIME(3) NULL,
  settledAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY partner_adjustment_revision (orderId,revision),
  KEY partner_adjustment_status (status,updatedAt),
  CONSTRAINT partner_adjustment_order FOREIGN KEY (orderId) REFERENCES procurement_partner_customer_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE partner_adjustment_payments (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  adjustmentId VARCHAR(80) NOT NULL,
  provider VARCHAR(16) NOT NULL,
  currency CHAR(3) NOT NULL,
  amountMinor BIGINT NOT NULL,
  settlementAmountMinor BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
  providerReference VARCHAR(191) NULL,
  captureReference VARCHAR(191) NULL,
  checkoutUrl TEXT NULL,
  attemptedAt DATETIME(3) NULL,
  feeMinor BIGINT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY partner_adjustment_checkout (adjustmentId),
  UNIQUE KEY partner_adjustment_provider_capture (provider,captureReference),
  CONSTRAINT partner_adjustment_payment_parent FOREIGN KEY (adjustmentId) REFERENCES partner_order_adjustments(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE partner_order_payment_fees (
  paymentReference VARCHAR(191) NOT NULL PRIMARY KEY,
  orderId VARCHAR(80) NOT NULL,
  currency CHAR(3) NOT NULL,
  feeMinor BIGINT NOT NULL,
  customerFeeMinor BIGINT NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY partner_order_fee_lookup (orderId),
  CONSTRAINT partner_fee_order FOREIGN KEY (orderId) REFERENCES procurement_partner_customer_orders(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE partner_adjustment_refunds (
  id VARCHAR(80) NOT NULL PRIMARY KEY,
  adjustmentId VARCHAR(80) NOT NULL,
  paymentId VARCHAR(191) NOT NULL,
  provider VARCHAR(16) NOT NULL,
  captureReference VARCHAR(191) NOT NULL,
  currency CHAR(3) NOT NULL,
  amountMinor BIGINT NOT NULL,
  settlementAmountMinor BIGINT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  providerReference VARCHAR(191) NULL,
  attemptedAt DATETIME(3) NULL,
  checkedAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY partner_adjustment_refund_provider (provider,providerReference),
  KEY partner_adjustment_refund_parent (adjustmentId,status),
  KEY partner_adjustment_refund_capture (provider,captureReference),
  CONSTRAINT partner_adjustment_refund_parent_fk FOREIGN KEY (adjustmentId) REFERENCES partner_order_adjustments(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

