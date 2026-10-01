-- Idempotent repair: production may have missed removed_at if an earlier deploy skipped migrate.
ALTER TABLE "participation" ADD COLUMN IF NOT EXISTS "removed_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "participation_removed_at_idx" ON "participation"("removed_at");
