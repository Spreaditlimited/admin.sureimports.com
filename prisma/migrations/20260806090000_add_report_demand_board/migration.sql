CREATE TABLE IF NOT EXISTS `intelligence_report_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidRequest` VARCHAR(80) NOT NULL,
  `query` VARCHAR(180) NOT NULL,
  `normalizedQuery` VARCHAR(180) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'requested',
  `voteCount` INT NOT NULL DEFAULT 0,
  `selectedWeek` VARCHAR(20) NULL,
  `queueSearchRequestId` VARCHAR(80) NULL,
  `publishedReportSlug` VARCHAR(180) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `intelligence_report_requests_pidRequest_key` (`pidRequest`),
  UNIQUE INDEX `intelligence_report_requests_normalizedQuery_key` (`normalizedQuery`),
  INDEX `intelligence_report_requests_status_voteCount_idx` (`status`, `voteCount`),
  INDEX `intelligence_report_requests_selectedWeek_idx` (`selectedWeek`),
  INDEX `intelligence_report_requests_queueSearchRequestId_idx` (`queueSearchRequestId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `intelligence_report_request_votes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pidVote` VARCHAR(80) NOT NULL,
  `requestId` VARCHAR(80) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `voterKey` VARCHAR(64) NOT NULL,
  `weekKey` VARCHAR(20) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `intelligence_report_request_votes_pidVote_key` (`pidVote`),
  UNIQUE INDEX `intelligence_report_request_votes_request_voter_week_key` (`requestId`, `voterKey`, `weekKey`),
  INDEX `intelligence_report_request_votes_week_created_idx` (`weekKey`, `createdAt`),
  INDEX `intelligence_report_request_votes_email_idx` (`email`),
  CONSTRAINT `intelligence_report_request_votes_requestId_fkey`
    FOREIGN KEY (`requestId`) REFERENCES `intelligence_report_requests` (`pidRequest`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
