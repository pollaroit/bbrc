import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	CreateFeedbackInputSchema,
	CreateFeedbackOutputSchema,
	GetBookFeedbackListInputSchema,
	GetBookFeedbackListOutputSchema,
	GetBookFeedbackStateInputSchema,
	GetBookFeedbackStateOutputSchema,
} from "./feedback.schema";
import {
	createFeedback,
	getBookFeedbackList,
	getBookFeedbackState,
} from "./feedback.service";

export const feedbackRouter = {
	getBookFeedbackList: publicProcedure
		.input(GetBookFeedbackListInputSchema)
		.output(GetBookFeedbackListOutputSchema)
		.handler(async ({ input, context }) =>
			getBookFeedbackList(input, context.db),
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
};
