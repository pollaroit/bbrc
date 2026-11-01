-- CreateEnum
CREATE TYPE "role" AS ENUM ('user', 'moderator', 'admin', 'super_admin');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role" "role" NOT NULL DEFAULT 'user';

-- The only super admin today. Nobody else was an admin, and nobody else becomes one here.
UPDATE "user" SET "role" = 'super_admin' WHERE "username" = 'mehdi';

-- AlterTable
ALTER TABLE "user" DROP COLUMN "is_admin";

-- CreateIndex
CREATE INDEX "user_role_idx" ON "user"("role");
