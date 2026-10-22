import {
	adminProcedure,
	protectedProcedure,
	publicProcedure,
} from "../../procedures";
import {
	AdminQuizActionOutputSchema,
	AdminQuizIdInputSchema,
	GetQuizEntryStateInputSchema,
	GetQuizEntryStateOutputSchema,
	GetQuizResultsInputSchema,
	GetQuizResultsOutputSchema,
	GetQuizReviewInputSchema,
	GetQuizReviewOutputSchema,
	ListBookQuizSubmissionsInputSchema,
	ListBookQuizSubmissionsOutputSchema,
	ListUserQuizzesInputSchema,
	ListUserQuizzesOutputSchema,
	ReportQuizQuestionInputSchema,
	ReportQuizQuestionOutputSchema,
	StartQuizInputSchema,
	StartQuizOutputSchema,
	SubmitQuizInputSchema,
	SubmitQuizOutputSchema,
} from "./quiz.schema";
import {
	adminClearUnavailableQuiz,
	adminDeleteQuiz,
	adminRegenerateQuiz,
	getQuizEntryState,
	getQuizResults,
	getQuizReview,
	listBookQuizSubmissions,
	listUserQuizzes,
	reportQuizQuestion,
	startQuiz,
	submitQuiz,
} from "./quiz.service";

export const quizRouter = {
	getEntryState: publicProcedure
		.input(GetQuizEntryStateInputSchema)
		.output(GetQuizEntryStateOutputSchema)
		.handler(({ input, context }) =>
			getQuizEntryState(input.slug, context.db, context.session),
		),
	start: protectedProcedure
		.input(StartQuizInputSchema)
		.output(StartQuizOutputSchema)
		.handler(({ input, context }) =>
			startQuiz(input.slug, context.db, context.session),
		),
	submit: protectedProcedure
		.input(SubmitQuizInputSchema)
		.output(SubmitQuizOutputSchema)
		.handler(({ input, context }) =>
			submitQuiz(input, context.db, context.session),
		),
	getResults: protectedProcedure
		.input(GetQuizResultsInputSchema)
		.output(GetQuizResultsOutputSchema)
		.handler(({ input, context }) =>
			getQuizResults(input.slug, context.db, context.session),
		),
	getReview: protectedProcedure
		.input(GetQuizReviewInputSchema)
		.output(GetQuizReviewOutputSchema)
		.handler(({ input, context }) =>
			getQuizReview(input, context.db, context.session),
		),
	reportQuestion: protectedProcedure
		.input(ReportQuizQuestionInputSchema)
		.output(ReportQuizQuestionOutputSchema)
		.handler(({ input, context }) =>
			reportQuizQuestion(input, context.db, context.session),
		),
	listForBook: publicProcedure
		.input(ListBookQuizSubmissionsInputSchema)
		.output(ListBookQuizSubmissionsOutputSchema)
		.handler(({ input, context }) =>
			listBookQuizSubmissions(input, context.db),
		),
	listForUser: publicProcedure
		.input(ListUserQuizzesInputSchema)
		.output(ListUserQuizzesOutputSchema)
		.handler(({ input, context }) =>
			listUserQuizzes(input, context.db, context.session),
		),
	adminDelete: adminProcedure
		.input(AdminQuizIdInputSchema)
		.output(AdminQuizActionOutputSchema)
		.handler(({ input, context }) => adminDeleteQuiz(input.quizId, context.db)),
	adminClearUnavailable: adminProcedure
		.input(AdminQuizIdInputSchema)
		.output(AdminQuizActionOutputSchema)
		.handler(({ input, context }) =>
			adminClearUnavailableQuiz(input.quizId, context.db),
		),
	adminRegenerate: adminProcedure
		.input(AdminQuizIdInputSchema)
		.output(AdminQuizActionOutputSchema)
		.handler(({ input, context }) =>
			adminRegenerateQuiz(input.quizId, context.db, context.session),
		),
};
