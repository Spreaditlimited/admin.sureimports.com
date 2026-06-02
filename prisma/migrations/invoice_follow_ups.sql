CREATE TABLE IF NOT EXISTS invoice_follow_ups (
  id INT NOT NULL AUTO_INCREMENT,
  pidFollowUp VARCHAR(191) NOT NULL,
  pidInvoice VARCHAR(191) NOT NULL,
  followUpNumber INT NOT NULL,
  subject VARCHAR(191) NOT NULL,
  status VARCHAR(191) NOT NULL DEFAULT 'SENT',
  error LONGTEXT NULL,
  sentAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX invoice_follow_ups_pidFollowUp_key (pidFollowUp),
  INDEX invoice_follow_ups_pidInvoice_idx (pidInvoice),
  INDEX invoice_follow_ups_sentAt_idx (sentAt),
  INDEX invoice_follow_ups_status_idx (status),
  PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
