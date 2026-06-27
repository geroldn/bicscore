/*
  Warnings:

  - A unique constraint covering the columns `[playerId,seasonId]` on the table `PlayerTmc` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PlayerTmc_playerId_seasonId_key" ON "PlayerTmc"("playerId", "seasonId");
