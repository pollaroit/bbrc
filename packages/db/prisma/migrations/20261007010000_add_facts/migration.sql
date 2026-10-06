-- CreateEnum
CREATE TYPE "FactCategory" AS ENUM ('general', 'history', 'science', 'literature', 'philosophy');

-- CreateEnum
CREATE TYPE "FactConfidence" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "fact" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "category" "FactCategory" NOT NULL,
    "confidence" "FactConfidence" NOT NULL,
    "source" TEXT NOT NULL,
    "image" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,

    CONSTRAINT "fact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_like" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fact_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "fact_like_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fact_published_at_idx" ON "fact"("published_at" DESC);

-- CreateIndex
CREATE INDEX "fact_created_by_id_idx" ON "fact"("created_by_id");

-- CreateIndex
CREATE INDEX "fact_like_fact_id_idx" ON "fact_like"("fact_id");

-- CreateIndex
CREATE INDEX "fact_like_user_id_idx" ON "fact_like"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fact_like_fact_id_user_id_key" ON "fact_like"("fact_id", "user_id");

-- AddForeignKey
ALTER TABLE "fact" ADD CONSTRAINT "fact_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_like" ADD CONSTRAINT "fact_like_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_like" ADD CONSTRAINT "fact_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
