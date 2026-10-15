-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_book" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "series_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "series_book_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE INDEX "series_title_idx" ON "series"("title");

-- CreateIndex
CREATE UNIQUE INDEX "series_book_book_id_key" ON "series_book"("book_id");

-- CreateIndex
CREATE INDEX "series_book_series_id_position_idx" ON "series_book"("series_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "series_book_series_id_position_key" ON "series_book"("series_id", "position");

-- AddForeignKey
ALTER TABLE "series_book" ADD CONSTRAINT "series_book_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_book" ADD CONSTRAINT "series_book_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
