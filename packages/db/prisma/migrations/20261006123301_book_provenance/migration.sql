-- DropForeignKey
ALTER TABLE "like" DROP CONSTRAINT "like_feedback_id_fkey";

-- DropIndex
DROP INDEX "participation_removed_at_idx";

-- DropIndex
DROP INDEX "sitting_selected_book_id_idx";

-- DropIndex
DROP INDEX "sitting_status_idx";

-- AddForeignKey
ALTER TABLE "like" ADD CONSTRAINT "like_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
