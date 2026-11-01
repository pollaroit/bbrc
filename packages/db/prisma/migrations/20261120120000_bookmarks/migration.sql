-- CreateEnum
CREATE TYPE "bookmark_resource_type" AS ENUM ('post', 'comment');

-- AlterTable
ALTER TABLE "post" ADD COLUMN "allow_bookmarks" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "comment" ADD COLUMN "allow_bookmarks" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "user" ADD COLUMN "bookmarks_visibility" "visibility" NOT NULL DEFAULT 'private';

-- CreateTable
CREATE TABLE "bookmark" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resource_type" "bookmark_resource_type" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "resource_created_at" TIMESTAMP(3) NOT NULL,
    "collection_id" TEXT,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookmark_user_id_created_at_idx" ON "bookmark"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookmark_user_id_resource_created_at_idx" ON "bookmark"("user_id", "resource_created_at");

-- CreateIndex
CREATE INDEX "bookmark_resource_type_resource_id_idx" ON "bookmark"("resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookmark_user_id_resource_type_resource_id_key" ON "bookmark"("user_id", "resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "bookmark" ADD CONSTRAINT "bookmark_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
