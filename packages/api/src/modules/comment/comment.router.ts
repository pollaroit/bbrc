import { notBannedProcedure, publicProcedure } from "../../procedures";
import { revalidateCommentIsr, revalidatePostIsr } from "../../revalidate-isr";
import { checkAchievementsAfter } from "../achievement/achievement-middleware";
import {
	CreateCommentInputSchema,
	CreateCommentOutputSchema,
	DeleteCommentInputSchema,
	DeleteCommentOutputSchema,
	GetCommentBySlugInputSchema,
	GetCommentBySlugOutputSchema,
	GetCommentListInputSchema,
	GetCommentListOutputSchema,
	UpdateCommentInputSchema,
	UpdateCommentOutputSchema,
} from "./comment.schema";
import {
	createComment,
	deleteComment,
	getCommentBySlug,
	getCommentList,
	updateComment,
} from "./comment.service";

export const commentRouter = {
	getCommentList: publicProcedure
		.input(GetCommentListInputSchema)
		.output(GetCommentListOutputSchema)
		.handler(async ({ input, context }) =>
			getCommentList(input, context.db, context.session),
		),
	getCommentBySlug: publicProcedure
		.input(GetCommentBySlugInputSchema)
		.output(GetCommentBySlugOutputSchema)
		.handler(async ({ input, context }) =>
			getCommentBySlug(input, context.db, context.session),
		),
	create: notBannedProcedure
		.use(checkAchievementsAfter("comments"))
		.input(CreateCommentInputSchema)
		.output(CreateCommentOutputSchema)
		.handler(async ({ input, context }) => {
			const comment = await createComment(
				input,
				context.session.user.id,
				context.db,
			);
			if (input.postSlug) {
				revalidatePostIsr(context, input.postSlug);
			} else if (input.feedbackSlug) {
				await revalidateCommentIsr(context, context.db, comment.slug);
			}
			return comment;
		}),
	update: notBannedProcedure
		.input(UpdateCommentInputSchema)
		.output(UpdateCommentOutputSchema)
		.handler(async ({ input, context }) => {
			const comment = await updateComment(
				input,
				context.session.user.id,
				context.db,
			);
			await revalidateCommentIsr(context, context.db, comment.slug);
			return comment;
		}),
	delete: notBannedProcedure
		.input(DeleteCommentInputSchema)
		.output(DeleteCommentOutputSchema)
		.handler(async ({ input, context }) => {
			await revalidateCommentIsr(context, context.db, input.slug);
			const result = await deleteComment(
				input,
				context.session.user.id,
				context.db,
			);
			return result;
		}),
};
