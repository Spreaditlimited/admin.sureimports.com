-- Migration to fix blog content column to support long content
-- Run this SQL directly on your MySQL database

-- Change blogContent from VARCHAR(191) to LONGTEXT to support full blog posts
ALTER TABLE `blog` MODIFY COLUMN `blogContent` LONGTEXT;

-- Update other blog columns for better storage
ALTER TABLE `blog` MODIFY COLUMN `blogSlug` VARCHAR(500);
ALTER TABLE `blog` MODIFY COLUMN `blogImage` VARCHAR(255);
ALTER TABLE `blog` MODIFY COLUMN `blogBy` VARCHAR(100);
ALTER TABLE `blog` MODIFY COLUMN `blogExt1` TEXT;
ALTER TABLE `blog` MODIFY COLUMN `blogExt2` TEXT;
ALTER TABLE `blog` MODIFY COLUMN `xStaus` VARCHAR(50);
