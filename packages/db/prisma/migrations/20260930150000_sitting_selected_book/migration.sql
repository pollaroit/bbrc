-- AlterTable
ALTER TABLE "sitting" ADD COLUMN "selected_book_id" TEXT;

-- AddForeignKey
ALTER TABLE "sitting" ADD CONSTRAINT "sitting_selected_book_id_fkey" FOREIGN KEY ("selected_book_id") REFERENCES "book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "sitting_selected_book_id_idx" ON "sitting"("selected_book_id");
