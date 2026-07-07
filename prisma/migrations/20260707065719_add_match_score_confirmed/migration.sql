-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "scoreAConfirmed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "scoreBConfirmed" BOOLEAN NOT NULL DEFAULT true;
