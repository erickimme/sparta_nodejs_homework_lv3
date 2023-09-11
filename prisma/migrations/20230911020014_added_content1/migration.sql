/*
  Warnings:

  - Added the required column `content1` to the `Posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Posts` ADD COLUMN `content1` VARCHAR(191) NOT NULL;
