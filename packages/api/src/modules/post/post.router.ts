import { notBannedProcedure, publicProcedure } from "../../procedures";
import { revalidateFeedsIsr, revalidatePostIsr } from "../../revalidate-isr";
import {
	CreatePostInputSchema,
	CreatePostOutputSchema,
	DeletePostInputSchema,
	DeletePostOutputSchema,
	GetPostBySlugInputSchema,
	GetPostBySlugOutputSchema,
	GetPostListInputSchema,
	GetPostListOutputSchema,
	UpdatePostInputSchema,
	UpdatePostOutputSchema,
} from "./post.schema";
import {
	createPost,
	deletePost,
	getPostBySlug,
	getPostList,
	updatePost,
} from "./post.service";

export const postRouter = {
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
	create: notBannedProcedure
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
