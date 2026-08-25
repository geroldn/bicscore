-- Backfill Match.playedAt from Match.createdAt for all rows
UPDATE "Match"
SET "playedAt" = "createdAt";
