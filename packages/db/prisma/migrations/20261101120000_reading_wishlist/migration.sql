-- CreateEnum
CREATE TYPE "book_edition_format" AS ENUM ('paperback', 'hardcover', 'ebook', 'audiobook', 'other');

-- CreateEnum
CREATE TYPE "book_edition_status" AS ENUM ('member', 'verified');

-- CreateEnum
CREATE TYPE "shelf_visibility" AS ENUM ('public', 'private');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'reading_behind';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "show_currently_reading" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_reading_progress" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "member_read" ADD COLUMN     "book_edition_id" TEXT;

-- AlterTable
ALTER TABLE "shelf" ADD COLUMN     "is_wishlist" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" "shelf_visibility" NOT NULL DEFAULT 'public';

-- CreateTable
CREATE TABLE "reading" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "edition_olid" TEXT,
    "edition_cover_id" INTEGER,
    "edition_label" TEXT,
    "book_edition_id" TEXT,
    "total_pages" INTEGER,
    "current_page" INTEGER,
    "percent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "reading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_log" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reading_id" TEXT NOT NULL,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "page" INTEGER,

    CONSTRAINT "reading_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_edition" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "book_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "title" TEXT,
    "language" TEXT NOT NULL DEFAULT 'eng',
    "pages" INTEGER NOT NULL,
    "isbn_13" TEXT,
    "isbn_10" TEXT,
    "publisher" TEXT,
    "published_year" INTEGER,
    "format" "book_edition_format" NOT NULL DEFAULT 'paperback',
    "translator" TEXT,
    "cover_url" TEXT,
    "notes" TEXT,
    "status" "book_edition_status" NOT NULL DEFAULT 'member',
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),

    CONSTRAINT "book_edition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reading_user_id_finished_at_idx" ON "reading"("user_id", "finished_at");

-- CreateIndex
CREATE INDEX "reading_book_id_finished_at_idx" ON "reading"("book_id", "finished_at");

-- CreateIndex
CREATE INDEX "reading_log_reading_id_created_at_idx" ON "reading_log"("reading_id", "created_at");

-- CreateIndex
CREATE INDEX "book_edition_book_id_idx" ON "book_edition"("book_id");

-- CreateIndex
CREATE INDEX "book_edition_created_by_id_created_at_idx" ON "book_edition"("created_by_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "book_edition_book_id_isbn_13_key" ON "book_edition"("book_id", "isbn_13");

-- CreateIndex
CREATE INDEX "member_read_book_edition_id_idx" ON "member_read"("book_edition_id");

-- CreateIndex
CREATE INDEX "shelf_visibility_status_idx" ON "shelf"("visibility", "status");

-- AddForeignKey
ALTER TABLE "member_read" ADD CONSTRAINT "member_read_book_edition_id_fkey" FOREIGN KEY ("book_edition_id") REFERENCES "book_edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading" ADD CONSTRAINT "reading_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading" ADD CONSTRAINT "reading_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading" ADD CONSTRAINT "reading_book_edition_id_fkey" FOREIGN KEY ("book_edition_id") REFERENCES "book_edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_log" ADD CONSTRAINT "reading_log_reading_id_fkey" FOREIGN KEY ("reading_id") REFERENCES "reading"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_edition" ADD CONSTRAINT "book_edition_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_edition" ADD CONSTRAINT "book_edition_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_edition" ADD CONSTRAINT "book_edition_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- One unfinished reading per member and book.
CREATE UNIQUE INDEX "reading_active_user_book_key" ON "reading"("user_id", "book_id") WHERE "finished_at" IS NULL;

-- One Wishlist shelf per member.
CREATE UNIQUE INDEX "shelf_user_wishlist_key" ON "shelf"("user_id") WHERE "is_wishlist";

-- A member's own shelf that already uses the "wishlist" address makes way for the real one.
UPDATE "shelf" SET "slug" = 'wishlist_shelf' WHERE "slug" = 'wishlist' AND NOT "is_wishlist"
  AND NOT EXISTS (SELECT 1 FROM "shelf" s2 WHERE s2."user_id" = "shelf"."user_id" AND s2."slug" = 'wishlist_shelf');

-- Every existing member gets a private, ordered Wishlist shelf.
INSERT INTO "shelf" ("id", "updated_at", "slug", "title", "description", "status", "type", "visibility", "is_wishlist", "user_id")
SELECT gen_random_uuid()::text, now(), 'wishlist', 'Wishlist', 'Books I want to read.', 'active', 'ordered', 'private', true, u."id"
FROM "user" u
WHERE NOT EXISTS (SELECT 1 FROM "shelf" s WHERE s."user_id" = u."id" AND s."is_wishlist");
