-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'not_specified');

-- CreateTable
CREATE TABLE "user_profile" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" "Gender" NOT NULL DEFAULT 'not_specified',
    "location" TEXT,
    "bio" TEXT,
    "favoriteGenres" TEXT[],
    "favoriteSubgenres" TEXT[],
    "website_url" TEXT,
    "social_links" JSONB,
    "wpm" INTEGER NOT NULL DEFAULT 240,

    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_user_id_key" ON "user_profile"("user_id");

-- AddForeignKey
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
