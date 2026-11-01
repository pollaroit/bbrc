import { z } from "zod";
import { protectedProcedure } from "../../procedures";
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
	FeedbackSlugImageInputSchema,
	FeedbackSlugOnlySchema,
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
	commitFeedbackImageUpload,
	commitPostImageUpload,
	commitShelfCoverUpload,
	initAvatarUpload,
	initCommentImageUpload,
	initFeedbackImageUpload,
	initPostImageUpload,
	initShelfCoverUpload,
	removeCommentImage,
	removeFeedbackImage,
	removePostImage,
	removeShelfCoverUpload,
} from "./storage-image.service";

const StorageStatusOutputSchema = z.object({
	configured: z.boolean(),
	env: z.enum(["development", "preview", "production"]),
});

export const storageRouter = {
	status: protectedProcedure
		.output(StorageStatusOutputSchema)
		.handler(async () => getStorageStatus()),

	initUpload: protectedProcedure
		.input(InitUploadInputSchema)
		.output(InitUploadOutputSchema)
		.handler(async ({ input, context }) => initUpload(input, context.session)),
	commitUpload: protectedProcedure
		.input(CommitUploadInputSchema)
		.output(CommitUploadOutputSchema)
		.handler(async ({ input, context }) =>
			commitUpload(input, context.session),
		),
	removeObject: protectedProcedure
		.input(z.object({ key: z.string().min(1) }))
		.output(z.object({ ok: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removeObject(input.key, context.session),
		),

	initAvatarUpload: protectedProcedure
		.input(ImageUploadBodySchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initAvatarUpload(input, context.session),
		),
	commitAvatarUpload: protectedProcedure
		.input(ImageUploadBodySchema)
		.output(ImageCommitOutputSchema)
		.handler(async ({ input, context }) =>
			commitAvatarUpload(input, context.session, context.db, context),
		),
	clearAvatarUpload: protectedProcedure
		.output(z.object({ cleared: z.literal(true) }))
		.handler(async ({ context }) =>
			clearAvatarUpload(context.session, context.db, context),
		),

	initPostImageUpload: protectedProcedure
		.input(PostSlugImageInputSchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initPostImageUpload(input.postSlug, input, context.session, context.db),
		),
	commitPostImageUpload: protectedProcedure
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
	removePostImage: protectedProcedure
		.input(PostSlugOnlySchema)
		.output(z.object({ removed: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removePostImage(input.postSlug, context.session, context.db, context),
		),

	initFeedbackImageUpload: protectedProcedure
		.input(FeedbackSlugImageInputSchema)
		.output(ImageUploadInitOutputSchema)
		.handler(async ({ input, context }) =>
			initFeedbackImageUpload(
				input.feedbackSlug,
				input,
				context.session,
				context.db,
			),
		),
	commitFeedbackImageUpload: protectedProcedure
		.input(FeedbackSlugImageInputSchema)
		.output(ImageCommitOutputSchema)
		.handler(async ({ input, context }) =>
			commitFeedbackImageUpload(
				input.feedbackSlug,
				input,
				context.session,
				context.db,
				context,
			),
		),
	removeFeedbackImage: protectedProcedure
		.input(FeedbackSlugOnlySchema)
		.output(z.object({ removed: z.literal(true) }))
		.handler(async ({ input, context }) =>
			removeFeedbackImage(
				input.feedbackSlug,
				context.session,
				context.db,
				context,
			),
		),

	initCommentImageUpload: protectedProcedure
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
	commitCommentImageUpload: protectedProcedure
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
	removeCommentImage: protectedProcedure
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

	initShelfCoverUpload: protectedProcedure
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
	commitShelfCoverUpload: protectedProcedure
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
	removeShelfCoverUpload: protectedProcedure
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
