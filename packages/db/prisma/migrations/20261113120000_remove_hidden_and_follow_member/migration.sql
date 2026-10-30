
-- AlterEnum
BEGIN;
CREATE TYPE "follow_target_type_new" AS ENUM ('author');
ALTER TABLE "follow" ALTER COLUMN "target_type" TYPE "follow_target_type_new" USING ("target_type"::text::"follow_target_type_new");
ALTER TYPE "follow_target_type" RENAME TO "follow_target_type_old";
ALTER TYPE "follow_target_type_new" RENAME TO "follow_target_type";
DROP TYPE "follow_target_type_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "follow" DROP CONSTRAINT "follow_target_user_id_fkey";

-- DropIndex
DROP INDEX "follow_target_user_id_idx";

-- DropIndex
DROP INDEX "follow_follower_id_target_user_id_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "is_hidden",
DROP COLUMN "show_currently_reading";

-- AlterTable
ALTER TABLE "follow" DROP COLUMN "target_user_id";

