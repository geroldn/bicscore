/*
  Warnings:

  - You are about to drop the column `userId` on the `ClubMembership` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `CompetitionEntry` table. All the data in the column will be lost.
  - You are about to drop the column `moyenne` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `tmc` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[playerId,clubId]` on the table `ClubMembership` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[competitionId,playerId]` on the table `CompetitionEntry` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `playerId` to the `ClubMembership` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerId` to the `CompetitionEntry` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClubMembership" DROP CONSTRAINT "ClubMembership_userId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitionEntry" DROP CONSTRAINT "CompetitionEntry_userId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_playerAId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_playerBId_fkey";

-- DropIndex
DROP INDEX "ClubMembership_userId_clubId_key";

-- DropIndex
DROP INDEX "CompetitionEntry_competitionId_userId_key";

-- AlterTable
ALTER TABLE "ClubMembership" DROP COLUMN "userId",
ADD COLUMN     "playerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "CompetitionEntry" DROP COLUMN "userId",
ADD COLUMN     "playerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "moyenne",
DROP COLUMN "tmc";

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "moyenne" DOUBLE PRECISION,
    "tmc" INTEGER,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMembership_playerId_clubId_key" ON "ClubMembership"("playerId", "clubId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_playerId_key" ON "CompetitionEntry"("competitionId", "playerId");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMembership" ADD CONSTRAINT "ClubMembership_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
