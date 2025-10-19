-- SQL Script to Remove Specified Columns from Database
-- Generated for food_recipes database

-- Remove Email_member column from diseases table
ALTER TABLE `diseases` DROP COLUMN `Email_member`;

-- Remove Member_email column from recipes table  
ALTER TABLE `recipes` DROP COLUMN `Member_email`;

-- Remove Admin column from recipes table
ALTER TABLE `recipes` DROP COLUMN `Admin`;

-- Note: The comments table doesn't have an 'admin' column in the current structure
-- If you need to remove a different column from comments, please specify the exact column name
