-- CreateEnum
CREATE TYPE "report_target" AS ENUM ('post', 'comment', 'review', 'shelf', 'user');

-- CreateEnum
CREATE TYPE "report_reason" AS ENUM ('spam', 'harassment', 'inappropriate', 'spoiler', 'other');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('open', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "report_action_kind" AS ENUM ('dismiss', 'delete_content', 'warn_owner', 'ban_owner', 'reopen', 'note');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'report_resolved';
ALTER TYPE "NotificationKind" ADD VALUE 'moderation_notice';

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "target_type" "report_target" NOT NULL,
    "target_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "owner_id" TEXT,
    "reason" "report_reason" NOT NULL,
    "note" TEXT,
    "snapshot_title" TEXT,
    "snapshot_text" TEXT,
    "snapshot_href" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'open',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "resolution" "report_action_kind",
    "reporter_notified_at" TIMESTAMP(3),

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_action" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_type" "report_target" NOT NULL,
    "target_id" TEXT NOT NULL,
    "admin_id" TEXT,
    "action" "report_action_kind" NOT NULL,
    "note" TEXT,

    CONSTRAINT "report_action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_status_created_at_idx" ON "report"("status", "created_at");

-- CreateIndex
CREATE INDEX "report_target_type_target_id_status_idx" ON "report"("target_type", "target_id", "status");

-- CreateIndex
CREATE INDEX "report_reporter_id_created_at_idx" ON "report"("reporter_id", "created_at");

-- CreateIndex
CREATE INDEX "report_owner_id_idx" ON "report"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "report_reporter_id_target_type_target_id_key" ON "report"("reporter_id", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "report_action_target_type_target_id_created_at_idx" ON "report_action"("target_type", "target_id", "created_at");

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_action" ADD CONSTRAINT "report_action_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

