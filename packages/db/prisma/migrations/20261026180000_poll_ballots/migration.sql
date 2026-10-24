-- AlterTable
ALTER TABLE "post_poll" ALTER COLUMN "ballot_visibility" SET DEFAULT 'owner';

-- CreateTable
CREATE TABLE "post_poll_ballot" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "poll_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "changes" INTEGER NOT NULL DEFAULT 0,
    "changed_at" TIMESTAMP(3),

    CONSTRAINT "post_poll_ballot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_poll_ballot_poll_id_user_id_key" ON "post_poll_ballot"("poll_id", "user_id");

-- AddForeignKey
ALTER TABLE "post_poll_ballot" ADD CONSTRAINT "post_poll_ballot_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "post_poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_poll_ballot" ADD CONSTRAINT "post_poll_ballot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

