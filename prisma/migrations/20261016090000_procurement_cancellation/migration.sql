ALTER TABLE orders ADD COLUMN cancellationLockedAt DATETIME(3) NULL;
CREATE TABLE procurement_cancellation_settings (
 id INTEGER NOT NULL PRIMARY KEY,
 feePercent DECIMAL(5,2) NOT NULL DEFAULT 2.00,
 updatedBy VARCHAR(191) NULL,
 updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
);
INSERT INTO procurement_cancellation_settings (id,feePercent) VALUES (1,2.00);
-- Preserve the furthest known stage, including orders subsequently placed on hold.
UPDATE orders o SET cancellationLockedAt=COALESCE(o.updatedAt,o.createdAt,NOW(3))
WHERE o.status IN ('pay-for-shipping','bank-pending-shipping-orders','in-transit','ready-for-pickup','completed','revert_to_approved')
 OR EXISTS (SELECT 1 FROM messages m WHERE m.pidOrder=o.pidOrder AND m.messageTitle IN ('Admin Message: PAY-FOR-SHIPPING','Admin Message: IN-TRANSIT','Admin Message: READY-FOR-PICKUP','Admin Message: COMPLETED','Admin Message: REVERT_TO_APPROVED'))
 OR COALESCE(o.trackingNumber,'')<>'';

ALTER TABLE refund_records MODIFY COLUMN ext2 TEXT NULL;
