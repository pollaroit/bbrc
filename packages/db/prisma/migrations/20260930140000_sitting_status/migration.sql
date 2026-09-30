-- CreateEnum
CREATE TYPE "SittingStatus" AS ENUM ('voting', 'reading', 'finished');

-- AlterTable
ALTER TABLE "sitting" ADD COLUMN "status" "SittingStatus" NOT NULL DEFAULT 'voting';

-- CreateIndex
CREATE INDEX "sitting_status_idx" ON "sitting"("status");
