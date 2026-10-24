-- CreateEnum
CREATE TYPE "PostPollType" AS ENUM ('single', 'multiple', 'ranking');

-- CreateEnum
CREATE TYPE "PostPollOptionKind" AS ENUM ('text', 'book', 'author', 'series', 'country', 'user');

-- CreateEnum
CREATE TYPE "PostPollResultsVisibility" AS ENUM ('everyone', 'voters', 'owner', 'after_deadline');

-- CreateEnum
CREATE TYPE "PostPollBallotVisibility" AS ENUM ('secret', 'turnout', 'owner', 'voters', 'public');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'poll_vote';
ALTER TYPE "NotificationKind" ADD VALUE 'poll_ended';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "allow_poll_options" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "allow_comments" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_likes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_shares" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "post_poll" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "post_id" TEXT NOT NULL,
    "type" "PostPollType" NOT NULL,
    "min_choices" INTEGER NOT NULL DEFAULT 1,
    "max_choices" INTEGER NOT NULL DEFAULT 1,
    "option_kind" "PostPollOptionKind" NOT NULL,
    "allow_user_options" BOOLEAN NOT NULL DEFAULT false,
    "max_options_per_user" INTEGER,
    "max_options_total" INTEGER,
    "results_visibility" "PostPollResultsVisibility" NOT NULL DEFAULT 'everyone',
    "ballot_visibility" "PostPollBallotVisibility" NOT NULL DEFAULT 'turnout',
    "allow_vote_change" BOOLEAN NOT NULL DEFAULT true,
    "deadline" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "ended_notified_at" TIMESTAMP(3),

    CONSTRAINT "post_poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_poll_option" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poll_id" TEXT NOT NULL,
    "kind" "PostPollOptionKind" NOT NULL,
    "label" TEXT NOT NULL,
    "book_id" TEXT,
    "series_id" TEXT,
    "user_id" TEXT,
    "ref_key" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "user_added" BOOLEAN NOT NULL DEFAULT false,
    "added_by_id" TEXT,

    CONSTRAINT "post_poll_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_poll_vote" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "poll_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rank" INTEGER,

    CONSTRAINT "post_poll_vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_poll_post_id_key" ON "post_poll"("post_id");

-- CreateIndex
CREATE INDEX "post_poll_option_poll_id_position_idx" ON "post_poll_option"("poll_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "post_poll_option_poll_id_dedupe_key_key" ON "post_poll_option"("poll_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "post_poll_vote_poll_id_user_id_idx" ON "post_poll_vote"("poll_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_poll_vote_option_id_user_id_key" ON "post_poll_vote"("option_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_poll_vote_poll_id_user_id_rank_key" ON "post_poll_vote"("poll_id", "user_id", "rank");

-- AddForeignKey
ALTER TABLE "post_poll" ADD CONSTRAINT "post_poll_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_option" ADD CONSTRAINT "post_poll_option_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "post_poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_option" ADD CONSTRAINT "post_poll_option_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_option" ADD CONSTRAINT "post_poll_option_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_option" ADD CONSTRAINT "post_poll_option_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_option" ADD CONSTRAINT "post_poll_option_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_vote" ADD CONSTRAINT "post_poll_vote_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "post_poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_vote" ADD CONSTRAINT "post_poll_vote_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "post_poll_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_vote" ADD CONSTRAINT "post_poll_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

