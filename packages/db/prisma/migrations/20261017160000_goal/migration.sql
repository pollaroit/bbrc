-- CreateEnum
CREATE TYPE "GoalScopeKind" AS ENUM ('none', 'authors', 'countries');

-- CreateTable
CREATE TABLE "goal" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "target" INTEGER NOT NULL,
    "scope_kind" "GoalScopeKind" NOT NULL DEFAULT 'none',
    "scope_authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scope_countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_id" TEXT NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_user_id_year_idx" ON "goal"("user_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "goal_user_id_slug_key" ON "goal"("user_id", "slug");

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
