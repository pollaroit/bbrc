-- CreateEnum
CREATE TYPE "Progress" AS ENUM ('not_started', 'in_progress', 'completed', 'dnf');

-- AlterTable: migrate integer progress + result into Progress enum
ALTER TABLE "participation" ADD COLUMN "progress_new" "Progress";

UPDATE "participation" AS p
SET "progress_new" = CASE
  WHEN p."result" = 'completed' OR p."progress" >= 100 THEN 'completed'::"Progress"
  WHEN p."progress" > 0 THEN 'in_progress'::"Progress"
  ELSE 'not_started'::"Progress"
END;

UPDATE "participation" AS p
SET "progress_new" = 'dnf'::"Progress"
FROM "sitting" AS s
WHERE p."sitting_id" = s."id"
  AND s."status" = 'finished'
  AND p."progress_new" IN ('not_started', 'in_progress');

ALTER TABLE "participation" ALTER COLUMN "progress_new" SET NOT NULL;
ALTER TABLE "participation" ALTER COLUMN "progress_new" SET DEFAULT 'not_started';

DROP INDEX IF EXISTS "participation_result_idx";

ALTER TABLE "participation" DROP COLUMN "pages";
ALTER TABLE "participation" DROP COLUMN "reading_notes";
ALTER TABLE "participation" DROP COLUMN "result";
ALTER TABLE "participation" DROP COLUMN "progress";

ALTER TABLE "participation" RENAME COLUMN "progress_new" TO "progress";

CREATE INDEX "participation_progress_idx" ON "participation"("progress");

DROP TYPE "ReadingResult";
