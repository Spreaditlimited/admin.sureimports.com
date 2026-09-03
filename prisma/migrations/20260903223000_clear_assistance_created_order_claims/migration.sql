-- Orders created while helping a user remain the user's saved orders. They are
-- not operationally claimed procurement orders after that access has ended.
UPDATE `orders` AS `order_record`
INNER JOIN `procurement_assistance_events` AS `created_event`
  ON `created_event`.`pidOrder` = `order_record`.`pidOrder`
  AND `created_event`.`eventType` = 'ORDER_CREATED'
INNER JOIN `procurement_assistance_cases` AS `assistance_case`
  ON `assistance_case`.`pidCase` = `created_event`.`pidCase`
INNER JOIN `procurement_assistance_events` AS `claim_event`
  ON `claim_event`.`pidCase` = `assistance_case`.`pidCase`
  AND `claim_event`.`eventType` = 'CLAIMED'
  AND `claim_event`.`actorPid` = `order_record`.`pidAdmin`
SET
  `order_record`.`pidAdmin` = NULL,
  `order_record`.`claimedAt` = NULL
WHERE
  `order_record`.`status` = 'saved'
  AND `assistance_case`.`status` IN ('REVOKED', 'RELEASED', 'EXPIRED');
