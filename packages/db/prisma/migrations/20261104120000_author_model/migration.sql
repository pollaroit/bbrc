-- CreateEnum
CREATE TYPE "author_gender" AS ENUM ('female', 'male', 'non_binary', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "author_status" AS ENUM ('verified', 'auto', 'needs_review');

-- CreateEnum
CREATE TYPE "author_enrichment_status" AS ENUM ('pending', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "follow_target_type" AS ENUM ('author', 'user');

-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'author_new_book';

-- CreateTable
CREATE TABLE "author" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_name" TEXT,
    "name_key" TEXT NOT NULL,
    "bio" TEXT,
    "bio_source" TEXT,
    "birth_year" INTEGER,
    "birth_month" INTEGER,
    "birth_day" INTEGER,
    "death_year" INTEGER,
    "death_month" INTEGER,
    "death_day" INTEGER,
    "birth_place" TEXT,
    "death_place" TEXT,
    "nationalities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gender" "author_gender" NOT NULL DEFAULT 'unknown',
    "wikipedia_url" TEXT,
    "goodreads_url" TEXT,
    "open_library_id" TEXT,
    "wikidata_id" TEXT,
    "website_url" TEXT,
    "photo_url" TEXT,
    "photo_credit" TEXT,
    "photo_license" TEXT,
    "photo_source_url" TEXT,
    "status" "author_status" NOT NULL DEFAULT 'auto',
    "field_meta" JSONB NOT NULL DEFAULT '{}',
    "enrichment_status" "author_enrichment_status" NOT NULL DEFAULT 'pending',
    "enrichment_attempts" INTEGER NOT NULL DEFAULT 0,
    "enrichment_error" TEXT,
    "enriched_at" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "author_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_alias" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "author_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_slug_redirect" (
    "slug" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,

    CONSTRAINT "author_slug_redirect_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "book_author" (
    "book_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "book_author_pkey" PRIMARY KEY ("book_id","author_id")
);

-- CreateTable
CREATE TABLE "follow" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "follower_id" TEXT NOT NULL,
    "target_type" "follow_target_type" NOT NULL,
    "author_id" TEXT,
    "target_user_id" TEXT,

    CONSTRAINT "follow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_slug_key" ON "author"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "author_open_library_id_key" ON "author"("open_library_id");

-- CreateIndex
CREATE INDEX "author_name_key_idx" ON "author"("name_key");

-- CreateIndex
CREATE INDEX "author_status_idx" ON "author"("status");

-- CreateIndex
CREATE INDEX "author_enrichment_status_idx" ON "author"("enrichment_status");

-- CreateIndex
CREATE INDEX "author_wikidata_id_idx" ON "author"("wikidata_id");

-- CreateIndex
CREATE UNIQUE INDEX "author_alias_key_key" ON "author_alias"("key");

-- CreateIndex
CREATE INDEX "author_alias_author_id_idx" ON "author_alias"("author_id");

-- CreateIndex
CREATE INDEX "author_slug_redirect_author_id_idx" ON "author_slug_redirect"("author_id");

-- CreateIndex
CREATE INDEX "book_author_author_id_idx" ON "book_author"("author_id");

-- CreateIndex
CREATE INDEX "book_author_book_id_position_idx" ON "book_author"("book_id", "position");

-- CreateIndex
CREATE INDEX "follow_author_id_idx" ON "follow"("author_id");

-- CreateIndex
CREATE INDEX "follow_target_user_id_idx" ON "follow"("target_user_id");

-- CreateIndex
CREATE INDEX "follow_follower_id_created_at_idx" ON "follow"("follower_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "follow_follower_id_author_id_key" ON "follow"("follower_id", "author_id");

-- CreateIndex
CREATE UNIQUE INDEX "follow_follower_id_target_user_id_key" ON "follow"("follower_id", "target_user_id");

-- AddForeignKey
ALTER TABLE "author" ADD CONSTRAINT "author_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_alias" ADD CONSTRAINT "author_alias_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_slug_redirect" ADD CONSTRAINT "author_slug_redirect_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_author" ADD CONSTRAINT "book_author_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_author" ADD CONSTRAINT "book_author_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "author"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "author"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow" ADD CONSTRAINT "follow_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

