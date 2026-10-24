import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import { revalidateFeedsIsr, revalidatePostIsr } from "../../revalidate-isr";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import {
	CreatePostInputSchema,
	CreatePostOutputSchema,
	DeletePostInputSchema,
	DeletePostOutputSchema,
	GetPostBySlugInputSchema,
	GetPostBySlugOutputSchema,
	GetPostListInputSchema,
	GetPostListOutputSchema,
	PostAttachmentPreferenceSchema,
	PreviewPostAttachmentInputSchema,
	PreviewPostAttachmentOutputSchema,
	UpdatePostInputSchema,
	UpdatePostOutputSchema,
} from "./post.schema";
import {
	createPost,
	deletePost,
	getPostAttachmentPreference,
	getPostBySlug,
	getPostList,
	setPostAttachmentPreference,
	updatePost,
} from "./post.service";
import { getPostAttachmentPreview } from "./post-attachment.service";

export const postRouter = {
	getAttachmentPreference: protectedProcedure
		.output(PostAttachmentPreferenceSchema)
		.handler(async ({ context }) =>
			getPostAttachmentPreference(context.session.user.id, context.db),
		),
	setAttachmentPreference: protectedProcedure
		.input(PostAttachmentPreferenceSchema)
		.output(PostAttachmentPreferenceSchema)
		.handler(async ({ input, context }) =>
			setPostAttachmentPreference(
				input.allowPostAttachment,
				context.session.user.id,
				context.db,
			),
		),
	getPostList: publicProcedure
		.input(GetPostListInputSchema)
		.output(GetPostListOutputSchema)
		.handler(async ({ input, context }) =>
			getPostList(input, context.db, context.session),
		),
	getPostBySlug: publicProcedure
		.input(GetPostBySlugInputSchema)
		.output(GetPostBySlugOutputSchema)
		.handler(async ({ input, context }) =>
			getPostBySlug(input, context.db, context.session),
		),
	previewAttachment: publicProcedure
		.input(PreviewPostAttachmentInputSchema)
		.output(PreviewPostAttachmentOutputSchema)
		.handler(async ({ input, context }) =>
			getPostAttachmentPreview(input, context.db, context.session?.user.id),
		),
	create: notBannedProcedure
		.use(checkAchievementsAfter("posts"))
		.input(CreatePostInputSchema)
		.output(CreatePostOutputSchema)
		.handler(async ({ input, context }) => {
			const post = await createPost(input, context.session.user.id, context.db);
			revalidatePostIsr(context, post.slug);
			revalidateFeedsIsr(context);
			return post;
		}),
	update: notBannedProcedure
		.input(UpdatePostInputSchema)
		.output(UpdatePostOutputSchema)
		.handler(async ({ input, context }) => {
			const post = await updatePost(input, context.session.user.id, context.db);
			revalidatePostIsr(context, post.slug);
			revalidateFeedsIsr(context);
			return post;
		}),
	delete: notBannedProcedure
		.input(DeletePostInputSchema)
		.output(DeletePostOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await deletePost(
				input,
				context.session.user.id,
				context.db,
			);
			revalidatePostIsr(context, result.slug);
			revalidateFeedsIsr(context);
			return result;
		}),
};
