-- AlterTable
ALTER TABLE "poll_option" ADD COLUMN "nominated_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_nominated_by_id_fkey" FOREIGN KEY ("nominated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
