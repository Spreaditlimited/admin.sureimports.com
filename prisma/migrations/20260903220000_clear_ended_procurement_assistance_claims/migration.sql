-- An ended authorization has no current admin assignee. The CLAIMED audit event
-- remains available as the historical record of who handled the request.
UPDATE `procurement_assistance_cases`
SET
  `assignedAdminPidUser` = NULL,
  `assignedAdminName` = NULL,
  `claimedAt` = NULL
WHERE `status` IN ('REVOKED', 'RELEASED', 'EXPIRED');
