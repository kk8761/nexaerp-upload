/*
  Warnings:

  - Made the column `creditLimit` on table `Supplier` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentBalance` on table `Supplier` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `Supplier` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Supplier" ALTER COLUMN "creditLimit" SET NOT NULL,
ALTER COLUMN "currentBalance" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL;
