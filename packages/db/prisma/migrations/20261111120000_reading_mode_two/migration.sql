
-- AlterTable
ALTER TABLE "reading_session" ADD COLUMN     "label" TEXT,
ALTER COLUMN "reading_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "reading" ADD COLUMN     "auto_page" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "current_seconds" INTEGER,
ADD COLUMN     "edition_format" "book_edition_format",
ADD COLUMN     "learned_pace" DOUBLE PRECISION,
ADD COLUMN     "pace_learned_at" TIMESTAMP(3),
ADD COLUMN     "total_seconds" INTEGER,
ADD COLUMN     "track_by_time" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "reading_log" ADD COLUMN     "estimated" BOOLEAN NOT NULL DEFAULT false;

