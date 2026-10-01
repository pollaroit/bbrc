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
	GetUserFeedbackListInputSchema,
	GetUserFeedbackListOutputSchema,
} from "./feedback.schema";
import {
	createFeedback,
	deleteFeedback,
	getBookFeedbackList,
	getBookFeedbackState,
	getUserFeedbackList,
} from "./feedback.service";

export const feedbackRouter = {
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
