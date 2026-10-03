-- CreateTable
CREATE TABLE "blocked_open_library_work" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "olid" TEXT NOT NULL,
    "title" TEXT,
    "blocked_by_user_id" TEXT NOT NULL,

    CONSTRAINT "blocked_open_library_work_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_open_library_work_olid_key" ON "blocked_open_library_work"("olid");

-- CreateIndex
CREATE INDEX "blocked_open_library_work_blocked_by_user_id_idx" ON "blocked_open_library_work"("blocked_by_user_id");

-- AddForeignKey
ALTER TABLE "blocked_open_library_work" ADD CONSTRAINT "blocked_open_library_work_blocked_by_user_id_fkey" FOREIGN KEY ("blocked_by_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
