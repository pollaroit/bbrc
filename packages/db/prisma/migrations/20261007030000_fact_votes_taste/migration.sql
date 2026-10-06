-- Expand fact categories
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'art';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'music';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'geography';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'psychology';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'technology';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'language';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'nature';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'culture';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'biography';
ALTER TYPE "FactCategory" ADD VALUE IF NOT EXISTS 'mathematics';

ALTER TABLE "fact" ADD COLUMN "subcategory" TEXT;
ALTER TABLE "fact" ADD COLUMN "ai_generated" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "FactVoteValue" AS ENUM ('up', 'down');

CREATE TABLE "fact_vote" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" "FactVoteValue" NOT NULL,
    "fact_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "fact_vote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fact_vote_fact_id_user_id_key" ON "fact_vote"("fact_id", "user_id");
CREATE INDEX "fact_vote_fact_id_idx" ON "fact_vote"("fact_id");
CREATE INDEX "fact_vote_user_id_idx" ON "fact_vote"("user_id");

ALTER TABLE "fact_vote" ADD CONSTRAINT "fact_vote_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fact_vote" ADD CONSTRAINT "fact_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "fact_vote" ("id", "created_at", "value", "fact_id", "user_id")
SELECT "id", "created_at", 'up'::"FactVoteValue", "fact_id", "user_id" FROM "fact_like";

DROP TABLE "fact_like";
