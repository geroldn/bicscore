-- CreateTable
CREATE TABLE "PlayerTmc" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "tmc" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerTmc_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlayerTmc" ADD CONSTRAINT "PlayerTmc_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
