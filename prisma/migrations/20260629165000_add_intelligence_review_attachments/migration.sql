ALTER TABLE `intelligence_review_requests`
  ADD COLUMN IF NOT EXISTS `attachmentsJson` LONGTEXT NULL AFTER `decisionNeeded`;
