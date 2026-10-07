-- Reading phase timestamps and QStash one-shot job ids for Telegram reminders.
ALTER TABLE "sitting"
ADD COLUMN "reading_started_at" TIMESTAMP(3),
ADD COLUMN "midterm_at" TIMESTAMP(3),
ADD COLUMN "qstash_midterm_message_id" TEXT,
ADD COLUMN "qstash_reading_warning_message_id" TEXT,
ADD COLUMN "telegram_poll_open_sent_at" TIMESTAMP(3);
