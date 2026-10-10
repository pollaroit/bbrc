-- AlterTable
ALTER TABLE "poll"
ADD COLUMN "min_published_in" INTEGER,
ADD COLUMN "max_published_in" INTEGER,
ADD COLUMN "min_open_library_rating" DOUBLE PRECISION,
ADD COLUMN "min_reads" INTEGER,
ADD COLUMN "max_reads" INTEGER,
ADD COLUMN "filter_countries" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "filter_author_slugs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
