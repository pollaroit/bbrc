-- AlterTable
ALTER TABLE "reading" ADD COLUMN     "edition_cover_url" TEXT;

-- AlterTable
ALTER TABLE "book_edition" ADD COLUMN     "open_library_olid" TEXT,
ADD COLUMN     "public_id" TEXT;

-- CreateTable
CREATE TABLE "edition_tombstone" (
    "public_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "removed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redirect_key" TEXT,

    CONSTRAINT "edition_tombstone_pkey" PRIMARY KEY ("public_id")
);

-- CreateTable
CREATE TABLE "edition_snapshot" (
    "olid" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "title" TEXT,
    "language" TEXT,
    "pages" INTEGER,
    "cover_id" INTEGER,
    "publisher" TEXT,
    "published_year" INTEGER,
    "format" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edition_snapshot_pkey" PRIMARY KEY ("olid")
);

-- CreateIndex
CREATE INDEX "edition_tombstone_book_id_idx" ON "edition_tombstone"("book_id");

-- CreateIndex
CREATE INDEX "edition_snapshot_book_id_idx" ON "edition_snapshot"("book_id");

-- CreateIndex
-- Existing editions get a short random address before it becomes required.
UPDATE "book_edition" SET "public_id" = substr(md5(random()::text || "id"), 1, 8) WHERE "public_id" IS NULL;
ALTER TABLE "book_edition" ALTER COLUMN "public_id" SET NOT NULL;
CREATE UNIQUE INDEX "book_edition_public_id_key" ON "book_edition"("public_id");

-- CreateIndex
CREATE INDEX "book_edition_open_library_olid_idx" ON "book_edition"("open_library_olid");

-- AddForeignKey
ALTER TABLE "edition_tombstone" ADD CONSTRAINT "edition_tombstone_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edition_snapshot" ADD CONSTRAINT "edition_snapshot_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

