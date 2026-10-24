import { z } from "zod";
import { notBannedProcedure } from "../../procedures";
import {
	CommitUploadInputSchema,
	CommitUploadOutputSchema,
	InitUploadInputSchema,
	InitUploadOutputSchema,
} from "./storage.schema";
import {
	commitUpload,
	getStorageStatus,
	initUpload,
	removeObject,
} from "./storage.service";
import {
	CommentSlugImageInputSchema,
	CommentSlugOnlySchema,
	ImageCommitOutputSchema,
	ImageUploadBodySchema,
	ImageUploadInitOutputSchema,
	PostSlugImageInputSchema,
	PostSlugOnlySchema,
	ShelfSlugImageInputSchema,
	ShelfSlugOnlySchema,
} from "./storage-image.schema";
import {
	clearAvatarUpload,
	commitAvatarUpload,
	commitCommentImageUpload,
	commitPostImageUpload,
	commitShelfCoverUpload,
	initAvatarUpload,
	initCommentImageUpload,
	initPostImageUpload,
	initShelfCoverUpload,
	removeCommentImage,
	removePostImage,
	removeShelfCoverUpload,
} from "./storage-image.service";

const StorageStatusOutputSchema = z.object({
	configured: z.boolean(),
	env: z.enum(["development", "preview", "production"]),
});

export const storageRouter = {
	status: notBannedProcedure
		.output(StorageStatusOutputSchema)
		.handler(async () => getStorageStatus()),

	initUpload: notBannedProcedure
		.input(InitUploadInputSchema)
		.output(InitUploadOutputSchema)
		.handler(async ({ input, context }) => initUpload(input, context.session)),
	commitUpload: notBannedProcedure
		.input(CommitUploadInputSchema)
		.output(CommitUploadOutputSchema)
		.handler(async ({ input, context }) =>
			commitUpload(input, context.session),
		),
	removeObject: notBannedProcedure
		.input(z.object({ key: z.string().min(1) }))
		.output(z.object({ ok: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removeObject(input.key, context.session),
		),

	initAvatarUpload: notBannedProcedure
		.input(ImageUploadBodySchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initAvatarUpload(input, context.session),
		),
	commitAvatarUpload: notBannedProcedure
		.input(ImageUploadBodySchema)
		.output(ImageCommitOutputSchema)
		.handler(async ({ input, context }) =>
			commitAvatarUpload(input, context.session, context.db, context),
		),
	clearAvatarUpload: notBannedProcedure
		.output(z.object({ cleared: z.literal(true) }))
		.handler(async ({ context }) =>
			clearAvatarUpload(context.session, context.db, context),
		),

	initPostImageUpload: notBannedProcedure
		.input(PostSlugImageInputSchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initPostImageUpload(input.postSlug, input, context.session, context.db),
		),
	commitPostImageUpload: notBannedProcedure
		.input(PostSlugImageInputSchema)
		.output(ImageCommitOutputSchema)
		.handler(async ({ input, context }) =>
			commitPostImageUpload(
				input.postSlug,
				input,
				context.session,
				context.db,
				context,
			),
		),
	removePostImage: notBannedProcedure
		.input(PostSlugOnlySchema)
		.output(z.object({ removed: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removePostImage(input.postSlug, context.session, context.db, context),
		),

	initCommentImageUpload: notBannedProcedure
		.input(CommentSlugImageInputSchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initCommentImageUpload(
				input.commentSlug,
				input,
				context.session,
				context.db,
			),
		),
	commitCommentImageUpload: notBannedProcedure
		.input(CommentSlugImageInputSchema)
		.output(ImageCommitOutputSchema)
		.handler(async ({ input, context }) =>
			commitCommentImageUpload(
				input.commentSlug,
				input,
				context.session,
				context.db,
				context,
			),
		),
	removeCommentImage: notBannedProcedure
		.input(CommentSlugOnlySchema)
		.output(z.object({ removed: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removeCommentImage(
				input.commentSlug,
				context.session,
				context.db,
				context,
			),
		),

	initShelfCoverUpload: notBannedProcedure
		.input(ShelfSlugImageInputSchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initShelfCoverUpload(
				input.shelfSlug,
				input.ownerUsername,
				input,
				context.session,
				context.db,
			),
		),
	commitShelfCoverUpload: notBannedProcedure
		.input(ShelfSlugImageInputSchema)
		.output(ImageCommitOutputSchema)
		.handler(async ({ input, context }) =>
			commitShelfCoverUpload(
				input.shelfSlug,
				input.ownerUsername,
				input,
				context.session,
				context.db,
				context,
			),
		),
	removeShelfCoverUpload: notBannedProcedure
		.input(ShelfSlugOnlySchema)
		.output(z.object({ removed: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removeShelfCoverUpload(
				input.shelfSlug,
				input.ownerUsername,
				context.session,
				context.db,
				context,
			),
		),
};
