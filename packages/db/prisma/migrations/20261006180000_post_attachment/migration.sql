-- CreateEnum
CREATE TYPE "PostAttachmentKind" AS ENUM ('book', 'shelf', 'sitting', 'user', 'feedback', 'post', 'comment');

-- CreateTable
CREATE TABLE "post_attachment" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" TEXT NOT NULL,
    "kind" "PostAttachmentKind" NOT NULL,
    "book_id" TEXT,
    "shelf_id" TEXT,
    "sitting_id" TEXT,
    "member_id" TEXT,
    "feedback_id" TEXT,
    "attached_post_id" TEXT,
    "comment_id" TEXT,

    CONSTRAINT "post_attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_attachment_post_id_key" ON "post_attachment"("post_id");

-- CreateIndex
CREATE INDEX "post_attachment_kind_idx" ON "post_attachment"("kind");

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_sitting_id_fkey" FOREIGN KEY ("sitting_id") REFERENCES "sitting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_attached_post_id_fkey" FOREIGN KEY ("attached_post_id") REFERENCES "post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_attachment" ADD CONSTRAINT "post_attachment_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill book attachments from legacy column
INSERT INTO "post_attachment" ("id", "post_id", "kind", "book_id")
SELECT gen_random_uuid(), p."id", 'book'::"PostAttachmentKind", p."attached_book_id"
FROM "post" p
WHERE p."attached_book_id" IS NOT NULL;
