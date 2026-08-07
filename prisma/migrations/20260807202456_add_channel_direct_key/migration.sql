-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "directKey" TEXT;

-- Backfill directKey for existing DIRECT channels (exactly 2 members),
-- as "sortedUserIdA:sortedUserIdB".
UPDATE "channels" c
SET "directKey" = sub.key
FROM (
  SELECT cm."channelId",
         string_agg(cm."userId", ':' ORDER BY cm."userId") AS key,
         count(*) AS member_count
  FROM "channel_members" cm
  GROUP BY cm."channelId"
) sub
WHERE c.id = sub."channelId" AND c.type = 'DIRECT' AND sub.member_count = 2;

-- Merge any DIRECT channels that ended up duplicated for the same pair
-- (the previous find-then-create in getOrCreateDirectChannel wasn't
-- atomic, so two people opening a DM for the first time at the same
-- moment could each create their own channel). Keep the oldest one,
-- move the other's messages into it, drop the duplicate.
DO $$
DECLARE
  dup RECORD;
  keeper_id TEXT;
  loser_id TEXT;
  i INT;
BEGIN
  FOR dup IN
    SELECT "organizationId", "directKey", array_agg(id ORDER BY "createdAt", id) AS ids
    FROM "channels"
    WHERE type = 'DIRECT' AND "directKey" IS NOT NULL
    GROUP BY "organizationId", "directKey"
    HAVING count(*) > 1
  LOOP
    keeper_id := dup.ids[1];
    FOR i IN 2..array_length(dup.ids, 1) LOOP
      loser_id := dup.ids[i];
      UPDATE "messages" SET "channelId" = keeper_id WHERE "channelId" = loser_id;
      DELETE FROM "channel_members" WHERE "channelId" = loser_id;
      DELETE FROM "channels" WHERE id = loser_id;
    END LOOP;
  END LOOP;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "channels_organizationId_directKey_key" ON "channels"("organizationId", "directKey");
