-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'sitting_opened';
ALTER TYPE "NotificationKind" ADD VALUE 'sitting_midterm_checkin';
ALTER TYPE "NotificationKind" ADD VALUE 'sitting_deadline_24h';
ALTER TYPE "NotificationKind" ADD VALUE 'sitting_reading_reminder';

-- DropIndex
DROP INDEX "user_telegram_user_id_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "telegram_sitting_reading_reminder_enabled",
DROP COLUMN "telegram_user_id",
DROP COLUMN "telegram_username";

-- AlterTable
ALTER TABLE "sitting" DROP COLUMN "qstash_midterm_message_id",
DROP COLUMN "qstash_reading_warning_message_id",
DROP COLUMN "telegram_poll_open_sent_at",
ADD COLUMN     "deadline_warning_notified_at" TIMESTAMP(3),
ADD COLUMN     "midterm_notified_at" TIMESTAMP(3),
ADD COLUMN     "reading_reminder_sent_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "push_device" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "push_device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_device_device_id_key" ON "push_device"("device_id");

-- CreateIndex
CREATE INDEX "push_device_user_id_idx" ON "push_device"("user_id");

-- AddForeignKey
ALTER TABLE "push_device" ADD CONSTRAINT "push_device_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Telegram is gone: its account links and link tokens go too.
DELETE FROM "account" WHERE "provider_id" = 'telegram';
DELETE FROM "verification" WHERE "identifier" LIKE 'telegram-link:%';

-- Sittings already past these moments are marked as notified, so the first run after this does not send old reminders.
UPDATE "sitting" SET "midterm_notified_at" = NOW() WHERE "midterm_at" IS NOT NULL AND "midterm_at" <= NOW();
UPDATE "sitting" SET "deadline_warning_notified_at" = NOW() WHERE "deadline" <= NOW() + INTERVAL '24 hours';
