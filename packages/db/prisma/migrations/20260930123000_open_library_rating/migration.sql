-- Rename Goodreads rating column to Open Library rating and allow nulls.
ALTER TABLE "book" RENAME COLUMN "goodreads_rating" TO "open_library_rating";
ALTER TABLE "book" ALTER COLUMN "open_library_rating" DROP NOT NULL;
