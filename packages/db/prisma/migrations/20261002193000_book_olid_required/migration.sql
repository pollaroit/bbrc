-- Require Open Library work ID on every catalog book (backfill must be complete).
ALTER TABLE "book" ALTER COLUMN "olid" SET NOT NULL;
