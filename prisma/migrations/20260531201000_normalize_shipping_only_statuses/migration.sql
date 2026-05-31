UPDATE shipping_only
SET status = CASE
  WHEN LOWER(TRIM(status)) IN ('ready-to-ship', 'ready to ship', 'pending') THEN 'product-shipped'
  WHEN LOWER(TRIM(status)) IN ('product shipped', 'shipped', 'approved') THEN 'product-shipped'
  WHEN LOWER(TRIM(status)) IN ('product arrived', 'arrived', 'pay-for-shipping') THEN 'product-arrived'
  WHEN LOWER(TRIM(status)) IN ('product delivered', 'completed', 'in-transit', 'ready-for-pickup') THEN 'product-delivered'
  WHEN LOWER(TRIM(status)) IN ('request received', 'saved') THEN 'request-received'
  WHEN LOWER(TRIM(status)) IN ('request cancelled', 'cancelled') THEN 'request-cancelled'
  ELSE status
END
WHERE status IS NOT NULL;
