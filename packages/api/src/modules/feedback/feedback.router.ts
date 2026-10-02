import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	CreateFeedbackInputSchema,
	CreateFeedbackOutputSchema,
	DeleteFeedbackInputSchema,
	DeleteFeedbackOutputSchema,
	GetBookFeedbackListInputSchema,
	GetBookFeedbackListOutputSchema,
	GetBookFeedbackStateInputSchema,
	GetBookFeedbackStateOutputSchema,
	GetFeedbackBySlugInputSchema,
	GetFeedbackBySlugOutputSchema,
	GetUserFeedbackListInputSchema,
	GetUserFeedbackListOutputSchema,
} from "./feedback.schema";
import {
	createFeedback,
	deleteFeedback,
	getBookFeedbackList,
	getBookFeedbackState,
	getFeedbackBySlug,
	getUserFeedbackList,
} from "./feedback.service";

export const feedbackRouter = {
	getFeedbackBySlug: publicProcedure
		.input(GetFeedbackBySlugInputSchema)
		.output(GetFeedbackBySlugOutputSchema)
		.handler(async ({ input, context }) =>
			getFeedbackBySlug(input, context.db, context.session),
		),
	getBookFeedbackList: publicProcedure
		.input(GetBookFeedbackListInputSchema)
		.output(GetBookFeedbackListOutputSchema)
		.handler(async ({ input, context }) =>
			getBookFeedbackList(input, context.db),
		),
	getUserFeedbackList: publicProcedure
		.input(GetUserFeedbackListInputSchema)
		.output(GetUserFeedbackListOutputSchema)
		.handler(async ({ input, context }) =>
			getUserFeedbackList(input, context.db),
		),
	getBookFeedbackState: protectedProcedure
		.input(GetBookFeedbackStateInputSchema)
		.output(GetBookFeedbackStateOutputSchema)
		.handler(async ({ input, context }) =>
			getBookFeedbackState(input, context.session.user.id, context.db),
		),
	create: notBannedProcedure
		.input(CreateFeedbackInputSchema)
		.output(CreateFeedbackOutputSchema)
		.handler(async ({ input, context }) =>
			createFeedback(input, context.session.user.id, context.db),
		),
	delete: notBannedProcedure
		.input(DeleteFeedbackInputSchema)
		.output(DeleteFeedbackOutputSchema)
		.handler(async ({ input, context }) =>
			deleteFeedback(input, context.session.user.id, context.db),
		),
};
