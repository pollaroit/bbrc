-- AlterEnum
ALTER TYPE "PostAttachmentKind" ADD VALUE 'author';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "allow_post_attachment" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "post_attachment" ADD COLUMN     "author_name" TEXT,
ADD COLUMN     "author_slug" TEXT;

