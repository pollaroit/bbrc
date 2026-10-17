-- AlterTable
ALTER TABLE "poll" ALTER COLUMN "take" SET DEFAULT 10;

-- AlterTable
ALTER TABLE "poll_vote" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "poll_chip_grant" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "poll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "can_use_golden" BOOLEAN NOT NULL DEFAULT false,
    "can_use_silver" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "poll_chip_grant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "poll_chip_grant_poll_id_idx" ON "poll_chip_grant"("poll_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_chip_grant_poll_id_user_id_key" ON "poll_chip_grant"("poll_id", "user_id");

-- AddForeignKey
ALTER TABLE "poll_chip_grant" ADD CONSTRAINT "poll_chip_grant_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_chip_grant" ADD CONSTRAINT "poll_chip_grant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
