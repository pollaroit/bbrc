-- AlterTable
ALTER TABLE "book" ADD COLUMN "requested_by_id" TEXT,
ADD COLUMN "approved_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
