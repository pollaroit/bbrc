-- CreateTable
CREATE TABLE "rating_definition" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating_key" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "rating_definition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rating_definition_user_id_rating_key_key" ON "rating_definition"("user_id", "rating_key");

-- AddForeignKey
ALTER TABLE "rating_definition" ADD CONSTRAINT "rating_definition_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
