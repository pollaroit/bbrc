-- Neon / production helper: backfill read_end_year + read_end_month from legacy JSON.
--
-- WHEN TO USE
-- - Columns read_end_year / read_end_month already exist AND read_end still exists
--   (i.e. you added columns manually but have not dropped read_end yet).
-- - If you ran `prisma migrate deploy` for 20261016170500_read_finished_month, you do
--   NOT need this script (migration already backfills and drops JSON columns).
--
-- ALWAYS preview before updating. Run each section separately in the Neon SQL Editor.

-- ---------------------------------------------------------------------------
-- 1) PREVIEW: how many rows will backfill vs stay null
-- ---------------------------------------------------------------------------
SELECT
  COUNT(*) FILTER (
    WHERE read_end IS NULL
  ) AS null_read_end,
  COUNT(*) FILTER (
    WHERE
      read_end IS NOT NULL
      AND read_end->>'year' IS NOT NULL
      AND read_end->>'month' IS NOT NULL
      AND (read_end->>'month')::integer BETWEEN 1 AND 12
      AND (read_end->>'year')::integer BETWEEN 1000 AND 2100
  ) AS will_backfill_month_year,
  COUNT(*) FILTER (
    WHERE
      read_end IS NOT NULL
      AND read_end->>'year' IS NOT NULL
      AND read_end->>'month' IS NULL
  ) AS year_only_will_become_null,
  COUNT(*) AS total
FROM member_read;

-- Sample rows that will backfill:
-- SELECT user_id, book_id, read_end, read_end_year, read_end_month
-- FROM member_read
-- WHERE read_end IS NOT NULL
-- LIMIT 20;

-- ---------------------------------------------------------------------------
-- 2) BACKFILL (wrap in a transaction; COMMIT only after review)
-- ---------------------------------------------------------------------------
BEGIN;

UPDATE member_read
SET
  read_end_year = (read_end->>'year')::integer,
  read_end_month = (read_end->>'month')::integer
WHERE
  read_end IS NOT NULL
  AND read_end->>'year' IS NOT NULL
  AND read_end->>'month' IS NOT NULL
  AND (read_end->>'year') ~ '^[0-9]+$'
  AND (read_end->>'month') ~ '^[0-9]+$'
  AND (read_end->>'year')::integer BETWEEN 1000 AND 2100
  AND (read_end->>'month')::integer BETWEEN 1 AND 12;

-- Optional: explicitly null year-only legacy values (already null on new columns).
UPDATE member_read
SET read_end_year = NULL, read_end_month = NULL
WHERE
  read_end IS NOT NULL
  AND read_end->>'year' IS NOT NULL
  AND read_end->>'month' IS NULL;

-- Verify pair integrity before commit:
SELECT COUNT(*) AS bad_pairs
FROM member_read
WHERE
  (read_end_year IS NULL AND read_end_month IS NOT NULL)
  OR (read_end_year IS NOT NULL AND read_end_month IS NULL);

-- Expected: bad_pairs = 0
-- COMMIT;
-- ROLLBACK;

-- ---------------------------------------------------------------------------
-- 3) AFTER deploy drops read_end (migration): sanity check only
-- ---------------------------------------------------------------------------
-- SELECT
--   COUNT(*) FILTER (WHERE read_end_year IS NOT NULL) AS dated_reads,
--   COUNT(*) FILTER (WHERE read_end_year IS NULL) AS undated_reads
-- FROM member_read;
