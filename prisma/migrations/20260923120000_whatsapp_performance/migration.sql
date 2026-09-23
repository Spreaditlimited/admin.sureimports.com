CREATE TABLE whatsapp_clicks (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  site VARCHAR(30) NOT NULL,
  path VARCHAR(250) NOT NULL,
  destination VARCHAR(80) NOT NULL,
  placement VARCHAR(20) NOT NULL,
  device VARCHAR(10) NOT NULL,
  sessionId VARCHAR(36) NULL,
  source VARCHAR(80) NOT NULL DEFAULT '',
  campaign VARCHAR(80) NOT NULL DEFAULT '',
  service VARCHAR(50) NOT NULL,
  audience VARCHAR(10) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX whatsapp_click_period (createdAt, site, audience),
  INDEX whatsapp_click_session (sessionId, createdAt)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE whatsapp_leads (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  phone VARCHAR(16) NOT NULL,
  name VARCHAR(120) NOT NULL,
  site VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  clickId VARCHAR(36) NULL,
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  receivedAt DATETIME(3) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  createdBy VARCHAR(191) NOT NULL,
  updatedBy VARCHAR(191) NOT NULL,
  UNIQUE KEY whatsapp_lead_phone (site, phone),
  UNIQUE KEY whatsapp_lead_click (clickId),
  INDEX whatsapp_lead_period (receivedAt, site, status),
  CONSTRAINT whatsapp_lead_click_fk FOREIGN KEY (clickId) REFERENCES whatsapp_clicks(id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE whatsapp_rate_limits (
  scopeHash CHAR(64) NOT NULL PRIMARY KEY,
  windowStart DATETIME(3) NOT NULL,
  attempts INT NOT NULL DEFAULT 1
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

