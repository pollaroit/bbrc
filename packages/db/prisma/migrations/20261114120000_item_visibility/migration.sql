
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "default_post_visibility" "visibility" NOT NULL DEFAULT 'public',
ADD COLUMN     "default_shelf_visibility" "visibility" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "goal" ADD COLUMN     "visibility" "visibility" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "post" ADD COLUMN     "visibility" "visibility" NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "feedback" ADD COLUMN     "visibility" "visibility" NOT NULL DEFAULT 'public';

