-- Book requests keyed by Open Library work ID only (metadata fetched on demand).
ALTER TABLE "book_request" ADD COLUMN "olid" TEXT;

DELETE FROM "book_request";

ALTER TABLE "book_request" DROP COLUMN IF EXISTS "title";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "description";
ALTER TABLE "book_request" DROP COLUMN IF EXISTS "url";

ALTER TABLE "book_request" ALTER COLUMN "olid" SET NOT NULL;

CREATE UNIQUE INDEX "book_request_olid_pending_key" ON "book_request"("olid") WHERE "status" = 'pending';

CREATE INDEX "book_request_olid_idx" ON "book_request"("olid");
