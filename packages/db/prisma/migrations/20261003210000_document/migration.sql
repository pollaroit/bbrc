-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "document_key" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "acceptance_notes" TEXT,
    "rejection_reason" TEXT,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_slug_key" ON "document"("slug");

-- CreateIndex
CREATE INDEX "document_book_id_status_idx" ON "document"("book_id", "status");

-- CreateIndex
CREATE INDEX "document_user_id_idx" ON "document"("user_id");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NotificationKind
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'document_submitted';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'document_approved';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'document_rejected';
