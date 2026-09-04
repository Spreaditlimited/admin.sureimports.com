UPDATE `procurement_assistance_cases`
SET
  `status` = 'EXPIRED',
  `activeRequestKey` = NULL,
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
  older.`activeRequestKey` = NULL,
  older.`assignedAdminPidUser` = NULL,
  older.`assignedAdminName` = NULL,
  older.`claimedAt` = NULL
WHERE older.`status` = 'ACTIVE';

UPDATE `procurement_assistance_cases`
SET `activeRequestKey` = CASE
  WHEN `status` = 'ACTIVE' THEN `pidUser`
  ELSE NULL
END;

CREATE TRIGGER `procurement_assistance_active_slot_before_insert`
BEFORE INSERT ON `procurement_assistance_cases`
FOR EACH ROW
SET NEW.`activeRequestKey` = CASE
  WHEN NEW.`status` = 'ACTIVE' THEN NEW.`pidUser`
  ELSE NULL
END;

CREATE TRIGGER `procurement_assistance_active_slot_before_update`
BEFORE UPDATE ON `procurement_assistance_cases`
FOR EACH ROW
SET NEW.`activeRequestKey` = CASE
  WHEN NEW.`status` = 'ACTIVE' THEN NEW.`pidUser`
  ELSE NULL
END;
