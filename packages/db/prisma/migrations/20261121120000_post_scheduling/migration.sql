-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('published', 'scheduled', 'publish_skipped');

-- AlterTable
ALTER TABLE "post"
ADD COLUMN "status" "PostStatus" NOT NULL DEFAULT 'published',
ADD COLUMN "scheduled_at" TIMESTAMP(3),
ADD COLUMN "first_scheduled_at" TIMESTAMP(3),
ADD COLUMN "published_at" TIMESTAMP(3);

-- Backfill: existing posts were live when created.
UPDATE "post" SET "published_at" = "created_at" WHERE "published_at" IS NULL;

-- CreateIndex
CREATE INDEX "post_status_scheduled_at_idx" ON "post"("status", "scheduled_at");
