-- Read finish month (year + month only). Drops legacy JSON read_start / read_end.

ALTER TABLE "member_read"
ADD COLUMN "read_end_month" INTEGER,
ADD COLUMN "read_end_year" INTEGER;

-- Backfill from read_end JSON: require year + month (1–12). Year-only → stays null.
UPDATE "member_read"
SET
  "read_end_year" = (read_end->>'year')::integer,
  "read_end_month" = (read_end->>'month')::integer
WHERE
  read_end IS NOT NULL
  AND read_end->>'year' IS NOT NULL
  AND read_end->>'month' IS NOT NULL
  AND (read_end->>'year') ~ '^[0-9]+$'
  AND (read_end->>'month') ~ '^[0-9]+$'
  AND (read_end->>'year')::integer BETWEEN 1000 AND 2100
  AND (read_end->>'month')::integer BETWEEN 1 AND 12;

-- Clear any inconsistent pairs (defensive).
UPDATE "member_read"
SET "read_end_year" = NULL, "read_end_month" = NULL
WHERE
  ("read_end_year" IS NULL AND "read_end_month" IS NOT NULL)
  OR ("read_end_year" IS NOT NULL AND "read_end_month" IS NULL);

ALTER TABLE "member_read" DROP COLUMN "read_start";
ALTER TABLE "member_read" DROP COLUMN "read_end";

ALTER TABLE "member_read"
ADD CONSTRAINT "member_read_finish_month_pair_check"
CHECK (
  ("read_end_year" IS NULL AND "read_end_month" IS NULL)
  OR ("read_end_year" IS NOT NULL AND "read_end_month" IS NOT NULL)
);

CREATE INDEX "member_read_user_id_read_end_year_read_end_month_idx"
ON "member_read" ("user_id", "read_end_year", "read_end_month");
