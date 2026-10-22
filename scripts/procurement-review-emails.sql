-- Apply before deploying the completion-email worker. No historic orders are queued.
CREATE TABLE IF NOT EXISTS procurement_review_emails (
 pidOrder VARCHAR(191) NOT NULL PRIMARY KEY,
 status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
 note TEXT NULL,
 attempts INT NOT NULL DEFAULT 0,
 createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 nextAttemptAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 claimedAt DATETIME(3) NULL,
 sentAt DATETIME(3) NULL,
 INDEX review_email_dispatch (status,nextAttemptAt)
);
