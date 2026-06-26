/*
  Warnings:

  - You are about to drop the column `role` on the `ClubMembership` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClubMembership" DROP COLUMN "role";

-- DropEnum
DROP TYPE "ClubMemberRole";
