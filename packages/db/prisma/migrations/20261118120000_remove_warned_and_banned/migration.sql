-- Warned and banned go away for now (a fuller system comes later). Reports can no longer warn or ban,
-- so any history that used those two actions is kept as a plain note and the closing action is cleared.
UPDATE "report_action" SET "action" = 'note' WHERE "action" IN ('warn_owner', 'ban_owner');
UPDATE "report" SET "resolution" = NULL WHERE "resolution" IN ('warn_owner', 'ban_owner');

-- AlterEnum
ALTER TYPE "report_action_kind" RENAME TO "report_action_kind_old";
CREATE TYPE "report_action_kind" AS ENUM ('dismiss', 'delete_content', 'reopen', 'note');
ALTER TABLE "report_action" ALTER COLUMN "action" TYPE "report_action_kind" USING ("action"::text::"report_action_kind");
ALTER TABLE "report" ALTER COLUMN "resolution" TYPE "report_action_kind" USING ("resolution"::text::"report_action_kind");
DROP TYPE "report_action_kind_old";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "status";

-- DropEnum
DROP TYPE "UserStatus";
