-- CreateTable
CREATE TABLE "book_reading_prerequisite" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "book_id" TEXT NOT NULL,
    "prerequisite_book_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "book_reading_prerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_reading_prerequisite_book_id_position_idx" ON "book_reading_prerequisite"("book_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "book_reading_prerequisite_book_id_prerequisite_book_id_key" ON "book_reading_prerequisite"("book_id", "prerequisite_book_id");

-- AddForeignKey
ALTER TABLE "book_reading_prerequisite" ADD CONSTRAINT "book_reading_prerequisite_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_reading_prerequisite" ADD CONSTRAINT "book_reading_prerequisite_prerequisite_book_id_fkey" FOREIGN KEY ("prerequisite_book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
