-- AlterTable
ALTER TABLE "Competition" ADD COLUMN     "laggingGamesGap" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "laggingGamesPercent" INTEGER NOT NULL DEFAULT 70;
