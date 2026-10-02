-- Threaded post comments (parentId + depth) and reply notifications.
ALTER TABLE "comment" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "comment" ADD COLUMN "depth" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "comment_post_id_parent_id_idx" ON "comment"("post_id", "parent_id");

ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'reply_to_your_comment';
