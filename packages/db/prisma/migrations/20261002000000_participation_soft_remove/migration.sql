-- AlterTable
ALTER TABLE "participation" ADD COLUMN "removed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "participation_removed_at_idx" ON "participation"("removed_at");
