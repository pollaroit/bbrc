-- CreateEnum
CREATE TYPE "PostTierlistItemKind" AS ENUM ('text', 'image', 'book', 'author');

-- CreateTable
CREATE TABLE "post_tierlist" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "post_tierlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tierlist_tier" (
    "id" TEXT NOT NULL,
    "tierlist_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "post_tierlist_tier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_tierlist_item" (
    "id" TEXT NOT NULL,
    "tierlist_id" TEXT NOT NULL,
    "tier_id" TEXT NOT NULL,
    "kind" "PostTierlistItemKind" NOT NULL,
    "label" TEXT,
    "image_url" TEXT,
    "book_id" TEXT,
    "author_id" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "post_tierlist_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_tierlist_post_id_key" ON "post_tierlist"("post_id");

-- CreateIndex
CREATE INDEX "post_tierlist_tier_tierlist_id_position_idx" ON "post_tierlist_tier"("tierlist_id", "position");

-- CreateIndex
CREATE INDEX "post_tierlist_item_tier_id_position_idx" ON "post_tierlist_item"("tier_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "post_tierlist_item_tierlist_id_dedupe_key_key" ON "post_tierlist_item"("tierlist_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "post_tierlist" ADD CONSTRAINT "post_tierlist_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tierlist_tier" ADD CONSTRAINT "post_tierlist_tier_tierlist_id_fkey" FOREIGN KEY ("tierlist_id") REFERENCES "post_tierlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tierlist_item" ADD CONSTRAINT "post_tierlist_item_tierlist_id_fkey" FOREIGN KEY ("tierlist_id") REFERENCES "post_tierlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tierlist_item" ADD CONSTRAINT "post_tierlist_item_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "post_tierlist_tier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tierlist_item" ADD CONSTRAINT "post_tierlist_item_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tierlist_item" ADD CONSTRAINT "post_tierlist_item_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "author"("id") ON DELETE SET NULL ON UPDATE CASCADE;

