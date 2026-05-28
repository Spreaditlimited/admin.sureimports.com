-- Expand long-form store content fields to prevent truncation
ALTER TABLE `store`
  MODIFY `productDescription` LONGTEXT NULL,
  MODIFY `productFeature` LONGTEXT NULL,
  MODIFY `productSpecification` LONGTEXT NULL;
