-- AlterTable
ALTER TABLE "book" ADD COLUMN "countries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
