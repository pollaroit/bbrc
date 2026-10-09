-- AlterTable (safe if 20261010020000 already applied without edition_id)
ALTER TABLE "member_read" ADD COLUMN IF NOT EXISTS "edition_id" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "member_read_edition_id_idx" ON "member_read"("edition_id");
