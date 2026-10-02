-- AlterEnum
ALTER TYPE "LikeSource" ADD VALUE 'feedback';

-- AlterTable
ALTER TABLE "comment" ALTER COLUMN "post_id" DROP NOT NULL;

ALTER TABLE "comment" ADD COLUMN "feedback_id" TEXT;

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN "slug" TEXT;

-- Backfill slugs for existing dev rows (production has none).
UPDATE "feedback"
SET "slug" = 'review_' || lower(substr(replace("id"::text, '-', ''), 1, 16))
WHERE "slug" IS NULL;

ALTER TABLE "feedback" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "like" ADD COLUMN "feedback_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "feedback_slug_key" ON "feedback"("slug");

CREATE INDEX "feedback_slug_idx" ON "feedback"("slug");

CREATE INDEX "comment_feedback_id_idx" ON "comment"("feedback_id");

CREATE INDEX "comment_feedback_id_parent_id_idx" ON "comment"("feedback_id", "parent_id");

CREATE INDEX "like_feedback_id_idx" ON "like"("feedback_id");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "like" ADD CONSTRAINT "like_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
