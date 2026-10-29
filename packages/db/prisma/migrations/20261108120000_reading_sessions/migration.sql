-- CreateEnum
CREATE TYPE "reading_session_mode" AS ENUM ('free', 'countdown', 'pomodoro');

-- CreateTable
CREATE TABLE "reading_session" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "reading_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_beat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "active_seconds" INTEGER NOT NULL DEFAULT 0,
    "mode" "reading_session_mode" NOT NULL DEFAULT 'free',
    "target_minutes" INTEGER,
    "percent_from" INTEGER NOT NULL DEFAULT 0,
    "percent_to" INTEGER,
    "page_from" INTEGER,
    "page_to" INTEGER,

    CONSTRAINT "reading_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reading_session_user_id_ended_at_idx" ON "reading_session"("user_id", "ended_at");

-- CreateIndex
CREATE INDEX "reading_session_reading_id_idx" ON "reading_session"("reading_id");

-- CreateIndex
CREATE INDEX "reading_session_ended_at_last_beat_at_idx" ON "reading_session"("ended_at", "last_beat_at");

-- AddForeignKey
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One open session per member (a new session ends the earlier one first).
CREATE UNIQUE INDEX "reading_session_one_open_per_user" ON "reading_session"("user_id") WHERE "ended_at" IS NULL;
