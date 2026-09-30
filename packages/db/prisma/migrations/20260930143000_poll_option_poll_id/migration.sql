-- AlterTable
ALTER TABLE "poll_option" ADD COLUMN "poll_id" TEXT;

-- Backfill not possible for orphan rows; new sittings will always set poll_id.
-- Existing poll_option rows (if any) are removed so the NOT NULL constraint can apply.
DELETE FROM "poll_option";

ALTER TABLE "poll_option" ALTER COLUMN "poll_id" SET NOT NULL;

-- CreateIndex
CREATE INDEX "poll_option_poll_id_idx" ON "poll_option"("poll_id");

-- CreateIndex
CREATE INDEX "poll_option_book_id_idx" ON "poll_option"("book_id");

-- AddForeignKey
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
