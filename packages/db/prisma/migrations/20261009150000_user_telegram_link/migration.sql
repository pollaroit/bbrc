-- Link BBRC users to Telegram (Login Widget / bot).
ALTER TABLE "user"
ADD COLUMN "telegram_user_id" TEXT,
ADD COLUMN "telegram_username" TEXT;

CREATE UNIQUE INDEX "user_telegram_user_id_key" ON "user"("telegram_user_id");
