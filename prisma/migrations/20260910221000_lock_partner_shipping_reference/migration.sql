CREATE UNIQUE INDEX `shipping_attribution_partner_reference_key`
  ON `shipping_request_attributions`(`affiliateId`, `sourceType`, `sourceReference`);
