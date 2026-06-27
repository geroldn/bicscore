-- CreateTable Season
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Season_name_key" ON "Season"("name");

-- Backfill: insert existing season
INSERT INTO "Season" (id, name, "startDate", "createdAt")
SELECT gen_random_uuid(), season, MIN("startDate"), NOW()
FROM "PlayerTmc"
GROUP BY season;

-- AlterTable PlayerTmc: add seasonId as nullable first
ALTER TABLE "PlayerTmc" ADD COLUMN "seasonId" TEXT;

-- Backfill seasonId from season name
UPDATE "PlayerTmc" pt
SET "seasonId" = s.id
FROM "Season" s
WHERE s.name = pt.season;

-- Now make it NOT NULL
ALTER TABLE "PlayerTmc" ALTER COLUMN "seasonId" SET NOT NULL;

-- Drop old columns
ALTER TABLE "PlayerTmc"
  DROP COLUMN "season",
  DROP COLUMN "startDate";

-- AlterTable Player
ALTER TABLE "Player" DROP COLUMN "tmc";

-- AddForeignKey
ALTER TABLE "PlayerTmc" ADD CONSTRAINT "PlayerTmc_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
