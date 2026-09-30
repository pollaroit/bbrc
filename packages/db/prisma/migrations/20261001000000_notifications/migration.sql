-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM (
  'member_posted',
  'comment_on_your_post',
  'reaction_on_your_post',
  'member_feedback_on_book',
  'book_added_to_library',
  'sitting_poll_started',
  'sitting_poll_closed',
  'participant_finished_book',
  'sitting_finished',
  'book_requested'
);

-- CreateTable
CREATE TABLE "notification" (
  "id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "read_at" TIMESTAMP(3),

  CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preference" (
  "user_id" TEXT NOT NULL,
  "kind" "NotificationKind" NOT NULL,
  "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
  "push_enabled" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("user_id","kind")
);

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_created_at_idx" ON "notification"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notification_user_id_created_at_idx" ON "notification"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
