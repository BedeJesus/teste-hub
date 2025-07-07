/*
  Warnings:

  - You are about to drop the column `unitPrice` on the `Product` table. All the data in the column will be lost.
  - Added the required column `unitaryPrice` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "unitPrice",
ADD COLUMN     "unitaryPrice" DOUBLE PRECISION NOT NULL;
