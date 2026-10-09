-- CreateTable
CREATE TABLE "member_read" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "read_start" JSONB,
    "read_end" JSONB,
    "edition_id" TEXT,

    CONSTRAINT "member_read_pkey" PRIMARY KEY ("user_id","book_id")
);

-- CreateIndex
CREATE INDEX "member_read_book_id_idx" ON "member_read"("book_id");

-- CreateIndex
CREATE INDEX "member_read_user_id_idx" ON "member_read"("user_id");

-- CreateIndex
CREATE INDEX "member_read_edition_id_idx" ON "member_read"("edition_id");

-- AddForeignKey
ALTER TABLE "member_read" ADD CONSTRAINT "member_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_read" ADD CONSTRAINT "member_read_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
