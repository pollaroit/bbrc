-- CreateEnum
CREATE TYPE "ShelfStatus" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ShelfType" AS ENUM ('ordered', 'unordered');

-- AlterEnum
ALTER TYPE "XPEventReason" ADD VALUE 'shelf';

-- CreateTable
CREATE TABLE "shelf" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ShelfStatus" NOT NULL DEFAULT 'draft',
    "type" "ShelfType" NOT NULL DEFAULT 'unordered',
    "user_id" TEXT NOT NULL,

    CONSTRAINT "shelf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_book" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shelf_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "shelf_book_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shelf_user_id_status_idx" ON "shelf"("user_id", "status");

-- CreateIndex
CREATE INDEX "shelf_user_id_updated_at_idx" ON "shelf"("user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_user_id_slug_key" ON "shelf"("user_id", "slug");

-- CreateIndex
CREATE INDEX "shelf_book_book_id_idx" ON "shelf_book"("book_id");

-- CreateIndex
CREATE INDEX "shelf_book_shelf_id_position_idx" ON "shelf_book"("shelf_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_book_shelf_id_book_id_key" ON "shelf_book"("shelf_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_book_shelf_id_position_key" ON "shelf_book"("shelf_id", "position");

-- AddForeignKey
ALTER TABLE "shelf" ADD CONSTRAINT "shelf_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_book" ADD CONSTRAINT "shelf_book_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelf"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_book" ADD CONSTRAINT "shelf_book_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
