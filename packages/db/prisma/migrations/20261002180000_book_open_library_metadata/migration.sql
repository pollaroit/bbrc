-- AlterTable
ALTER TABLE "book" ADD COLUMN "olid" TEXT,
ADD COLUMN "subject_people" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "subject_times" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "book_olid_key" ON "book"("olid");
