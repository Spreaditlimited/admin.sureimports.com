ALTER TABLE `procurement_assistance_cases`
  ADD COLUMN `activeRequestKey` VARCHAR(191) NULL;

UPDATE `orders` AS assisted_order
INNER JOIN `procurement_assistance_events` AS created_event
  ON created_event.`pidOrder` = assisted_order.`pidOrder`
  AND created_event.`eventType` = 'ORDER_CREATED'
INNER JOIN `procurement_assistance_cases` AS assistance_case
  ON assistance_case.`pidCase` = created_event.`pidCase`
LEFT JOIN `procurement_assistance_cases` AS newer_case
  ON newer_case.`pidUser` = assistance_case.`pidUser`
  AND newer_case.`status` = 'ACTIVE'
  AND (
    newer_case.`authorizedAt` > assistance_case.`authorizedAt`
    OR (
      newer_case.`authorizedAt` = assistance_case.`authorizedAt`
      AND newer_case.`id` > assistance_case.`id`
    )
  )
SET assisted_order.`pidAdmin` = NULL, assisted_order.`claimedAt` = NULL
WHERE assistance_case.`status` = 'ACTIVE'
  AND assisted_order.`status` = 'saved'
  AND assisted_order.`pidAdmin` = assistance_case.`assignedAdminPidUser`
  AND (
    assistance_case.`expiresAt` <= CURRENT_TIMESTAMP(3)
    OR newer_case.`id` IS NOT NULL
  );

UPDATE `procurement_assistance_cases`
SET
  `status` = 'EXPIRED',
  `assignedAdminPidUser` = NULL,
  `assignedAdminName` = NULL,
  `claimedAt` = NULL
WHERE `status` = 'ACTIVE'
  AND `expiresAt` <= CURRENT_TIMESTAMP(3);

UPDATE `procurement_assistance_cases` AS older
INNER JOIN `procurement_assistance_cases` AS newer
  ON newer.`pidUser` = older.`pidUser`
  AND newer.`status` = 'ACTIVE'
  AND (
    newer.`authorizedAt` > older.`authorizedAt`
    OR (newer.`authorizedAt` = older.`authorizedAt` AND newer.`id` > older.`id`)
  )
SET
  older.`status` = 'SUPERSEDED',
  older.`assignedAdminPidUser` = NULL,
  older.`assignedAdminName` = NULL,
  older.`claimedAt` = NULL
WHERE older.`status` = 'ACTIVE';

UPDATE `procurement_assistance_cases`
SET `activeRequestKey` = `pidUser`
WHERE `status` = 'ACTIVE';

CREATE UNIQUE INDEX `procurement_assistance_cases_activeRequestKey_key`
  ON `procurement_assistance_cases`(`activeRequestKey`);
