-- AlterTable
ALTER TABLE "book_request" ADD COLUMN "authors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
