-- Remove snapshot columns if an earlier draft of 20261002200000 added them.
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "authors";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "cover_id";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "pages";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "published_in";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "open_library_rating";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "excerpt";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "subject_people";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "subject_times";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "subjects";
