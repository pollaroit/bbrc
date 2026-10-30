
-- CreateEnum
CREATE TYPE "visibility" AS ENUM ('public', 'friends', 'private');

-- CreateEnum
CREATE TYPE "profile_visibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "friendship_status" AS ENUM ('pending', 'accepted');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'friend_request';
ALTER TYPE "NotificationKind" ADD VALUE 'friend_accepted';

-- AlterEnum
ALTER TYPE "shelf_visibility" ADD VALUE 'friends';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "auto_accept_friends" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "favorites_visibility" "visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "goals_visibility" "visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "profile_visibility" "profile_visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "reading_visibility" "visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "reads_visibility" "visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "reviews_visibility" "visibility" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "user_profile" ADD COLUMN     "date_of_birth_visibility" "visibility" NOT NULL DEFAULT 'private',
ADD COLUMN     "gender_visibility" "visibility" NOT NULL DEFAULT 'private',
ADD COLUMN     "location_visibility" "visibility" NOT NULL DEFAULT 'public';

-- CreateTable
CREATE TABLE "friendship" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMP(3),
    "user_low_id" TEXT NOT NULL,
    "user_high_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "status" "friendship_status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "friend_request_log" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "declined_at" TIMESTAMP(3),
    "requester_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,

    CONSTRAINT "friend_request_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_block" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blocker_id" TEXT NOT NULL,
    "blocked_id" TEXT NOT NULL,

    CONSTRAINT "user_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friendship_user_low_id_status_idx" ON "friendship"("user_low_id", "status");

-- CreateIndex
CREATE INDEX "friendship_user_high_id_status_idx" ON "friendship"("user_high_id", "status");

-- CreateIndex
CREATE INDEX "friendship_requester_id_status_idx" ON "friendship"("requester_id", "status");

-- CreateIndex
CREATE INDEX "friendship_status_created_at_idx" ON "friendship"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "friendship_user_low_id_user_high_id_key" ON "friendship"("user_low_id", "user_high_id");

-- CreateIndex
CREATE INDEX "friend_request_log_requester_id_created_at_idx" ON "friend_request_log"("requester_id", "created_at");

-- CreateIndex
CREATE INDEX "friend_request_log_requester_id_target_id_declined_at_idx" ON "friend_request_log"("requester_id", "target_id", "declined_at");

-- CreateIndex
CREATE INDEX "user_block_blocked_id_idx" ON "user_block"("blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_block_blocker_id_blocked_id_key" ON "user_block"("blocker_id", "blocked_id");

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_low_id_fkey" FOREIGN KEY ("user_low_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_user_high_id_fkey" FOREIGN KEY ("user_high_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_request_log" ADD CONSTRAINT "friend_request_log_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_request_log" ADD CONSTRAINT "friend_request_log_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A friendship pair is stored low < high so it can only exist once, and the requester is one of the two.
-- Byte order (COLLATE "C"), the same order JavaScript uses to sort the two ids.
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_pair_order" CHECK (("user_low_id" COLLATE "C") < ("user_high_id" COLLATE "C"));
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requester_in_pair" CHECK ("requester_id" IN ("user_low_id", "user_high_id"));
ALTER TABLE "friend_request_log" ADD CONSTRAINT "friend_request_log_not_self" CHECK ("requester_id" <> "target_id");
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_not_self" CHECK ("blocker_id" <> "blocked_id");

-- "Show what I am reading" becomes the "currently reading" level: on = everyone, off = only me.
UPDATE "user" SET "reading_visibility" = 'private' WHERE "show_currently_reading" = false;

-- Date of birth and gender were readable by anyone without ever being a choice: they now default to "only me"
-- (the column default above already applied to existing rows); location stays public.
