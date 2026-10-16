-- AlterTable
ALTER TABLE "post" ADD COLUMN "is_spoiler" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "comment" ADD COLUMN "is_spoiler" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN "is_spoiler" BOOLEAN NOT NULL DEFAULT false;
