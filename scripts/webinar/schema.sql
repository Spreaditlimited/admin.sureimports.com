CREATE TABLE IF NOT EXISTS webinar_welcomes (
  email VARCHAR(191) NOT NULL PRIMARY KEY,
  pidUser VARCHAR(191) NULL,
  watched TINYINT(1) NOT NULL DEFAULT 0,
  accountCreatedAt DATETIME(3) NULL,
  welcomeStatus VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  claimedAt DATETIME(3) NULL,
  sentAt DATETIME(3) NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY webinar_account_queue (welcomeStatus, accountCreatedAt),
  KEY webinar_account (pidUser)
);
