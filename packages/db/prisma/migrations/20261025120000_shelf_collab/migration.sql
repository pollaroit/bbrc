-- CreateEnum
CREATE TYPE "ShelfPermission" AS ENUM ('add_book', 'remove_book', 'edit_notes', 'edit_title', 'edit_description', 'edit_cover', 'edit_type', 'edit_status', 'edit_ordering_on_simple', 'edit_ordering_on_ranked', 'view_non_public', 'delete_shelf', 'add_collaborator', 'remove_collaborator', 'edit_permissions');

-- CreateEnum
CREATE TYPE "ShelfInvitationStatus" AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ShelfActivityKind" AS ENUM ('book_added', 'book_removed', 'books_reordered', 'notes_edited', 'shelf_updated', 'collaborator_joined', 'collaborator_left', 'collaborator_removed', 'permissions_changed', 'ownership_transferred');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'shelf_invitation';
ALTER TYPE "NotificationKind" ADD VALUE 'shelf_collaboration';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "allow_shelf_invites" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "shelf_book" ADD COLUMN     "added_by_id" TEXT,
ADD COLUMN     "updated_by_id" TEXT;

-- CreateTable
CREATE TABLE "shelf_collaborator" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shelf_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permissions" "ShelfPermission"[],
    "invited_by_id" TEXT,

    CONSTRAINT "shelf_collaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_invitation" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shelf_id" TEXT NOT NULL,
    "invitee_id" TEXT NOT NULL,
    "invited_by_id" TEXT NOT NULL,
    "permissions" "ShelfPermission"[],
    "status" "ShelfInvitationStatus" NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "shelf_invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_activity" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shelf_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "kind" "ShelfActivityKind" NOT NULL,
    "target_user_id" TEXT,
    "meta" JSONB,

    CONSTRAINT "shelf_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shelf_collaborator_user_id_idx" ON "shelf_collaborator"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_collaborator_shelf_id_user_id_key" ON "shelf_collaborator"("shelf_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_invitation_token_key" ON "shelf_invitation"("token");

-- CreateIndex
CREATE INDEX "shelf_invitation_shelf_id_status_idx" ON "shelf_invitation"("shelf_id", "status");

-- CreateIndex
CREATE INDEX "shelf_invitation_invitee_id_status_idx" ON "shelf_invitation"("invitee_id", "status");

-- CreateIndex
CREATE INDEX "shelf_activity_shelf_id_created_at_idx" ON "shelf_activity"("shelf_id", "created_at");

-- AddForeignKey
ALTER TABLE "shelf_book" ADD CONSTRAINT "shelf_book_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_book" ADD CONSTRAINT "shelf_book_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_collaborator" ADD CONSTRAINT "shelf_collaborator_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_collaborator" ADD CONSTRAINT "shelf_collaborator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_collaborator" ADD CONSTRAINT "shelf_collaborator_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_invitation" ADD CONSTRAINT "shelf_invitation_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_invitation" ADD CONSTRAINT "shelf_invitation_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_invitation" ADD CONSTRAINT "shelf_invitation_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_activity" ADD CONSTRAINT "shelf_activity_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_activity" ADD CONSTRAINT "shelf_activity_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_activity" ADD CONSTRAINT "shelf_activity_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every existing shelf entry was added (and last changed) by the shelf's owner.
UPDATE "shelf_book" AS sb
SET "added_by_id" = s."user_id",
    "updated_by_id" = s."user_id"
FROM "shelf" AS s
WHERE sb."shelf_id" = s."id"
  AND sb."added_by_id" IS NULL;
