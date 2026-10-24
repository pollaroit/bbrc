-- CreateEnum
CREATE TYPE "ParticipationJoinSource" AS ENUM ('organiser', 'button', 'link', 'invitation');

-- CreateEnum
CREATE TYPE "SittingInvitationStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "SittingJoinType" AS ENUM ('public', 'unlisted', 'private');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'sitting_member_joined';
ALTER TYPE "NotificationKind" ADD VALUE 'sitting_invitation';
ALTER TYPE "NotificationKind" ADD VALUE 'sitting_added';
ALTER TYPE "NotificationKind" ADD VALUE 'sitting_welcome';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "allow_sitting_auto_add" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allow_sitting_invites" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "participation" ADD COLUMN     "invite_link_id" TEXT,
ADD COLUMN     "join_source" "ParticipationJoinSource" NOT NULL DEFAULT 'organiser',
ADD COLUMN     "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "sitting" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "join_in_reading" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "join_in_voting" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "join_reading_until_percent" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "join_type" "SittingJoinType" NOT NULL DEFAULT 'public';

-- CreateTable
CREATE TABLE "sitting_invite_link" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sitting_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "expires_at" TIMESTAMP(3),
    "max_uses" INTEGER,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "revoked_at" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "sitting_invite_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitting_invite_link_visit" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "link_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "sitting_invite_link_visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sitting_invitation" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sitting_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "invited_by_id" TEXT,
    "status" "SittingInvitationStatus" NOT NULL DEFAULT 'pending',
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "sitting_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sitting_invite_link_token_key" ON "sitting_invite_link"("token");

-- CreateIndex
CREATE INDEX "sitting_invite_link_sitting_id_idx" ON "sitting_invite_link"("sitting_id");

-- CreateIndex
CREATE UNIQUE INDEX "sitting_invite_link_visit_link_id_user_id_key" ON "sitting_invite_link_visit"("link_id", "user_id");

-- CreateIndex
CREATE INDEX "sitting_invitation_sitting_id_status_idx" ON "sitting_invitation"("sitting_id", "status");

-- CreateIndex
CREATE INDEX "sitting_invitation_invitee_id_status_idx" ON "sitting_invitation"("invitee_id", "status");

-- AddForeignKey
ALTER TABLE "participation" ADD CONSTRAINT "participation_invite_link_id_fkey" FOREIGN KEY ("invite_link_id") REFERENCES "sitting_invite_link"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invite_link" ADD CONSTRAINT "sitting_invite_link_sitting_id_fkey" FOREIGN KEY ("sitting_id") REFERENCES "sitting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invite_link" ADD CONSTRAINT "sitting_invite_link_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invite_link_visit" ADD CONSTRAINT "sitting_invite_link_visit_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "sitting_invite_link"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invite_link_visit" ADD CONSTRAINT "sitting_invite_link_visit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invitation" ADD CONSTRAINT "sitting_invitation_sitting_id_fkey" FOREIGN KEY ("sitting_id") REFERENCES "sitting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invitation" ADD CONSTRAINT "sitting_invitation_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting_invitation" ADD CONSTRAINT "sitting_invitation_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sitting" ADD CONSTRAINT "sitting_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Sittings that exist today were filled by the organisers only, so they stay Private.
-- New sittings default to Public.
UPDATE "sitting" SET "join_type" = 'private';
