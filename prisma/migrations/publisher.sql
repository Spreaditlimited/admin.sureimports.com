-- Create blog_publisher table if it doesn't exist
CREATE TABLE IF NOT EXISTS blog_publisher (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pidPublisher VARCHAR(191) NOT NULL UNIQUE,
  publisherName VARCHAR(100) NOT NULL,
  publisherSlug VARCHAR(100),
  publisherEmail VARCHAR(255),
  publisherBio TEXT,
  publisherRole VARCHAR(100),
  publisherImage VARCHAR(255),
  publisherSocialX VARCHAR(255),
  publisherSocialLinkedin VARCHAR(255),
  publisherSocialFacebook VARCHAR(255),
  publisherSocialInstagram VARCHAR(255),
  publisherWebsite VARCHAR(255),
  status VARCHAR(20) DEFAULT 'active',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME
);

-- Add publisherId column to blog table if it doesn't exist
ALTER TABLE blog ADD COLUMN IF NOT EXISTS publisherId VARCHAR(191);

-- Add index on publisherId
CREATE INDEX IF NOT EXISTS blog_publisherId_idx ON blog(publisherId);
