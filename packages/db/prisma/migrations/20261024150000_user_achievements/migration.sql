-- AlterEnum
ALTER TYPE "NotificationKind" ADD VALUE 'achievement_earned';

-- CreateTable
CREATE TABLE "user_achievement" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "achievement_key" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "period_key" TEXT NOT NULL DEFAULT '',
    "earned_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "pin_order" INTEGER,

    CONSTRAINT "user_achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_achievement_user_id_idx" ON "user_achievement"("user_id");

-- CreateIndex
CREATE INDEX "user_achievement_achievement_key_idx" ON "user_achievement"("achievement_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievement_user_id_achievement_key_tier_period_key_key" ON "user_achievement"("user_id", "achievement_key", "tier", "period_key");

-- AddForeignKey
ALTER TABLE "user_achievement" ADD CONSTRAINT "user_achievement_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
