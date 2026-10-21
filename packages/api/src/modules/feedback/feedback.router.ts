import {
	notBannedProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import { revalidateBookIsr } from "../../revalidate-isr";
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
	UpdateFeedbackInputSchema,
	UpdateFeedbackOutputSchema,
} from "./feedback.schema";
import {
	createFeedback,
	deleteFeedback,
	getBookFeedbackList,
	getBookFeedbackState,
	getFeedbackBySlug,
	getUserFeedbackList,
	updateFeedback,
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
			getBookFeedbackList(input, context.db, context.session),
		),
	getUserFeedbackList: publicProcedure
		.input(GetUserFeedbackListInputSchema)
		.output(GetUserFeedbackListOutputSchema)
		.handler(async ({ input, context }) =>
			getUserFeedbackList(input, context.db, context.session),
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
		.handler(async ({ input, context }) => {
			const feedback = await createFeedback(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateBookIsr(context, input.bookSlug);
			return feedback;
		}),
	update: notBannedProcedure
		.input(UpdateFeedbackInputSchema)
		.output(UpdateFeedbackOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await updateFeedback(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateBookIsr(context, input.bookSlug);
			return result;
		}),
	delete: notBannedProcedure
		.input(DeleteFeedbackInputSchema)
		.output(DeleteFeedbackOutputSchema)
		.handler(async ({ input, context }) => {
			const result = await deleteFeedback(
				input,
				context.session.user.id,
				context.db,
			);
			revalidateBookIsr(context, input);
			return result;
		}),
};
