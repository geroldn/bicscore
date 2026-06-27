-- Backfill PlayerTmc from existing Player.tmc
INSERT INTO "PlayerTmc" (id, "playerId", season, tmc, "startDate", "createdAt")
SELECT gen_random_uuid(), id, '2025-2026-2', tmc, '2026-01-01', NOW()
FROM "Player"
WHERE tmc IS NOT NULL;
