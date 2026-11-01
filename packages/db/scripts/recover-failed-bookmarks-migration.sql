-- Undo a partial apply of 20261120120000_bookmarks (failed on bookmarks_visibility).
-- Run once, then: prisma migrate resolve --rolled-back 20261120120000_bookmarks
-- and bun run db:migrate:deploy.

ALTER TABLE "user" DROP COLUMN IF EXISTS "bookmarks_visibility";
DROP TABLE IF EXISTS "bookmark";
ALTER TABLE "post" DROP COLUMN IF EXISTS "allow_bookmarks";
ALTER TABLE "comment" DROP COLUMN IF EXISTS "allow_bookmarks";
DROP TYPE IF EXISTS "bookmark_resource_type";
