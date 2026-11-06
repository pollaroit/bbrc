-- CreateEnum
CREATE TYPE "BookSource" AS ENUM ('open_library', 'manual');

-- AlterTable: manual books have no Open Library work id.
ALTER TABLE "book" ALTER COLUMN "olid" DROP NOT NULL;

-- AlterTable: every existing book came from Open Library and is offered to sittings.
ALTER TABLE "book"
ADD COLUMN "source" "BookSource" NOT NULL DEFAULT 'open_library',
ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "primary_edition_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "book_primary_edition_id_key" ON "book"("primary_edition_id");
CREATE INDEX "book_hidden_idx" ON "book"("hidden");

-- AddForeignKey
ALTER TABLE "book" ADD CONSTRAINT "book_primary_edition_id_fkey" FOREIGN KEY ("primary_edition_id") REFERENCES "book_edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
