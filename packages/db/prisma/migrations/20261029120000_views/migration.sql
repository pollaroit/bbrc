-- CreateEnum
CREATE TYPE "view_resource" AS ENUM ('book', 'post', 'shelf', 'review', 'user');

-- CreateEnum
CREATE TYPE "view_kind" AS ENUM ('detail', 'list');

-- CreateEnum
CREATE TYPE "view_source" AS ENUM ('feed', 'profile', 'shelves', 'books', 'people', 'book_reviews', 'sitting_reviews', 'sitting', 'search', 'notification', 'external', 'direct', 'other');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationKind" ADD VALUE 'view_milestone';
ALTER TYPE "NotificationKind" ADD VALUE 'views_digest';

-- CreateTable
CREATE TABLE "view" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resource" "view_resource" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "kind" "view_kind" NOT NULL,
    "source" "view_source" NOT NULL DEFAULT 'other',
    "viewer_user_id" TEXT,
    "visitor_id" TEXT NOT NULL,
    "is_owner" BOOLEAN NOT NULL DEFAULT false,
    "ip" TEXT,
    "user_agent" TEXT,
    "country" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "referrer_host" TEXT,

    CONSTRAINT "view_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_daily" (
    "day" DATE NOT NULL,
    "resource" "view_resource" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "kind" "view_kind" NOT NULL,
    "source" "view_source" NOT NULL,
    "is_member" BOOLEAN NOT NULL,
    "device" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "views" INTEGER NOT NULL,

    CONSTRAINT "view_daily_pkey" PRIMARY KEY ("day","resource","resource_id","kind","source","is_member","device","country")
);

-- CreateTable
CREATE TABLE "view_daily_unique" (
    "day" DATE NOT NULL,
    "resource" "view_resource" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "kind" "view_kind" NOT NULL,
    "member_viewers" INTEGER NOT NULL,
    "guest_viewers" INTEGER NOT NULL,
    "views" INTEGER NOT NULL,

    CONSTRAINT "view_daily_unique_pkey" PRIMARY KEY ("day","resource","resource_id","kind")
);

-- CreateTable
CREATE TABLE "viewer_seen" (
    "resource" "view_resource" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "viewer_seen_pkey" PRIMARY KEY ("resource","resource_id","user_id")
);

-- CreateTable
CREATE TABLE "view_total" (
    "resource" "view_resource" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "view_total_pkey" PRIMARY KEY ("resource","resource_id")
);

-- CreateTable
CREATE TABLE "view_bot_day" (
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "view_bot_day_pkey" PRIMARY KEY ("day")
);

-- CreateIndex
CREATE INDEX "view_resource_resource_id_created_at_idx" ON "view"("resource", "resource_id", "created_at");

-- CreateIndex
CREATE INDEX "view_created_at_idx" ON "view"("created_at");

-- CreateIndex
CREATE INDEX "view_visitor_id_created_at_idx" ON "view"("visitor_id", "created_at");

-- CreateIndex
CREATE INDEX "view_viewer_user_id_created_at_idx" ON "view"("viewer_user_id", "created_at");

-- CreateIndex
CREATE INDEX "view_daily_resource_resource_id_day_idx" ON "view_daily"("resource", "resource_id", "day");

-- CreateIndex
CREATE INDEX "view_daily_unique_resource_resource_id_day_idx" ON "view_daily_unique"("resource", "resource_id", "day");

-- CreateIndex
CREATE INDEX "viewer_seen_user_id_idx" ON "viewer_seen"("user_id");

-- CreateIndex
CREATE INDEX "viewer_seen_resource_resource_id_last_seen_at_idx" ON "viewer_seen"("resource", "resource_id", "last_seen_at");

-- AddForeignKey
ALTER TABLE "view" ADD CONSTRAINT "view_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viewer_seen" ADD CONSTRAINT "viewer_seen_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

