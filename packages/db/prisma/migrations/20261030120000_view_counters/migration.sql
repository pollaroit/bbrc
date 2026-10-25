-- AlterTable
ALTER TABLE "book" ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewer_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "shelf" ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viewer_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "view_total" ADD COLUMN     "viewers" INTEGER NOT NULL DEFAULT 0;


-- Fill the new counters from what is already recorded.
UPDATE "view_total" t SET "viewers" = (
  SELECT count(*)::int FROM "viewer_seen" s
  WHERE s."resource" = t."resource" AND s."resource_id" = t."resource_id"
);
UPDATE "book" b SET "view_count" = t."opens", "viewer_count" = t."viewers"
FROM "view_total" t WHERE t."resource" = 'book' AND t."resource_id" = b."id";
UPDATE "shelf" s SET "view_count" = t."opens", "viewer_count" = t."viewers"
FROM "view_total" t WHERE t."resource" = 'shelf' AND t."resource_id" = s."id";
