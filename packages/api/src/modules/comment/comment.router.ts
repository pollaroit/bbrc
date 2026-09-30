import { notBannedProcedure, publicProcedure } from "../../procedures";
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
		.input(CreateCommentInputSchema)
		.output(CreateCommentOutputSchema)
		.handler(async ({ input, context }) =>
			createComment(input, context.session.user.id, context.db),
		),
	update: notBannedProcedure
		.input(UpdateCommentInputSchema)
		.output(UpdateCommentOutputSchema)
		.handler(async ({ input, context }) =>
			updateComment(input, context.session.user.id, context.db),
		),
	delete: notBannedProcedure
		.input(DeleteCommentInputSchema)
		.output(DeleteCommentOutputSchema)
		.handler(async ({ input, context }) =>
			deleteComment(input, context.session.user.id, context.db),
		),
};
