-- CreateTable
CREATE TABLE "fact_impression" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fact_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "fact_impression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fact_impression_user_id_idx" ON "fact_impression"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "fact_impression_fact_id_user_id_key" ON "fact_impression"("fact_id", "user_id");

-- AddForeignKey
ALTER TABLE "fact_impression" ADD CONSTRAINT "fact_impression_fact_id_fkey" FOREIGN KEY ("fact_id") REFERENCES "fact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_impression" ADD CONSTRAINT "fact_impression_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
