-- AlterTable
ALTER TABLE "book" ADD COLUMN     "reading_now_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wishlist_count" INTEGER NOT NULL DEFAULT 0;

-- Fill the copies from what exists now (visible members only).
UPDATE "book" b SET "reading_now_count" = c.n
FROM (
  SELECT r."book_id" AS book_id, count(*)::int AS n
  FROM "reading" r JOIN "user" u ON u."id" = r."user_id"
  WHERE r."finished_at" IS NULL AND NOT u."is_hidden"
  GROUP BY r."book_id"
) c WHERE c.book_id = b."id";

UPDATE "book" b SET "wishlist_count" = c.n
FROM (
  SELECT sb."book_id" AS book_id, count(*)::int AS n
  FROM "shelf_book" sb
  JOIN "shelf" s ON s."id" = sb."shelf_id" AND s."is_wishlist"
  JOIN "user" u ON u."id" = s."user_id"
  WHERE NOT u."is_hidden"
  GROUP BY sb."book_id"
) c WHERE c.book_id = b."id";
