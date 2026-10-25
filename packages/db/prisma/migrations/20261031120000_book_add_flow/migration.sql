-- AlterTable
ALTER TABLE "book" ADD COLUMN     "custom_cover_url" TEXT;

-- AlterTable
ALTER TABLE "book_request" ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "series_book" ALTER COLUMN "position" SET DATA TYPE DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "book_request_upvote" (
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "request_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "book_request_upvote_pkey" PRIMARY KEY ("request_id","user_id")
);

-- CreateTable
CREATE TABLE "book_discover_cache" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_discover_cache_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "book_discover_ask" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "book_discover_ask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "book_request_upvote_user_id_idx" ON "book_request_upvote"("user_id");

-- CreateIndex
CREATE INDEX "book_discover_cache_expires_at_idx" ON "book_discover_cache"("expires_at");

-- CreateIndex
CREATE INDEX "book_discover_ask_user_id_created_at_idx" ON "book_discover_ask"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "book_request_upvote" ADD CONSTRAINT "book_request_upvote_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "book_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_request_upvote" ADD CONSTRAINT "book_request_upvote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_discover_ask" ADD CONSTRAINT "book_discover_ask_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

