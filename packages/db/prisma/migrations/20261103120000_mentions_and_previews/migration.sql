-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'mention';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "allow_mentions" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "content_mention" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mentioned_user_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "post_id" TEXT,
    "comment_id" TEXT,
    "feedback_id" TEXT,

    CONSTRAINT "content_mention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "link_preview_cache" (
    "url_hash" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "title" TEXT,
    "description" TEXT,
    "site_name" TEXT,
    "image_url" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "link_preview_cache_pkey" PRIMARY KEY ("url_hash")
);

-- CreateIndex
CREATE INDEX "content_mention_mentioned_user_id_created_at_idx" ON "content_mention"("mentioned_user_id", "created_at");

-- CreateIndex
CREATE INDEX "content_mention_post_id_idx" ON "content_mention"("post_id");

-- CreateIndex
CREATE INDEX "content_mention_comment_id_idx" ON "content_mention"("comment_id");

-- CreateIndex
CREATE INDEX "content_mention_feedback_id_idx" ON "content_mention"("feedback_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_mention_mentioned_user_id_post_id_key" ON "content_mention"("mentioned_user_id", "post_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_mention_mentioned_user_id_comment_id_key" ON "content_mention"("mentioned_user_id", "comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "content_mention_mentioned_user_id_feedback_id_key" ON "content_mention"("mentioned_user_id", "feedback_id");

-- CreateIndex
CREATE INDEX "link_preview_cache_expires_at_idx" ON "link_preview_cache"("expires_at");

-- AddForeignKey
ALTER TABLE "content_mention" ADD CONSTRAINT "content_mention_mentioned_user_id_fkey" FOREIGN KEY ("mentioned_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mention" ADD CONSTRAINT "content_mention_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mention" ADD CONSTRAINT "content_mention_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mention" ADD CONSTRAINT "content_mention_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_mention" ADD CONSTRAINT "content_mention_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

