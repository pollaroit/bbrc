import {
	OffsetPaginationInputSchema,
	OffsetPaginationMetadataSchema,
} from "@bbrc/schemas/listing/pagination";
import { z } from "zod";
import { QUIZ_CHOICE_COUNT, QUIZ_QUESTION_COUNT } from "./quiz-scoring";

const SlugInput = z.object({ slug: z.string().min(1) });

const QuizBookSchema = z.object({
	slug: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	coverId: z.number().int().nullable(),
});

const QuizPersonSchema = z.object({
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
});

const QuizSubmissionStatusSchema = z.enum([
	"in_progress",
	"submitted",
	"forfeited",
]);

// --- entry state (book header) ---

export const GetQuizEntryStateInputSchema = SlugInput;
export const GetQuizEntryStateOutputSchema = z.object({
	state: z.enum([
		"signed_out",
		"not_read",
		"can_start",
		"in_progress",
		"submitted",
		"forfeited",
		"unavailable",
	]),
	/** First-time quizzes the viewer can still start today; null when signed out. */
	firstTimeLeftToday: z.number().int().min(0).nullable(),
	/** True once the quiz questions exist, so starting costs no first-time quiz. */
	quizReady: z.boolean(),
	/** Members who finished this quiz (visible members only). */
	submissionCount: z.number().int().min(0),
});

// --- start ---

export const StartQuizInputSchema = SlugInput;

export const QuizPlayQuestionSchema = z.object({
	position: z.number().int().min(1).max(QUIZ_QUESTION_COUNT),
	question: z.string(),
	choices: z.array(z.string()).length(QUIZ_CHOICE_COUNT),
});

export const StartQuizOutputSchema = z.discriminatedUnion("status", [
	z.object({ status: z.literal("generating") }),
	z.object({
		status: z.literal("ready"),
		startedAt: z.coerce.date(),
		expiresAt: z.coerce.date(),
		questions: z.array(QuizPlayQuestionSchema).length(QUIZ_QUESTION_COUNT),
	}),
	z.object({
		status: z.literal("unavailable"),
		until: z.coerce.date().nullable(),
	}),
	z.object({
		status: z.literal("limit_reached"),
		reason: z.enum(["first_time", "failures"]),
		limit: z.number().int(),
		resetsAt: z.coerce.date(),
	}),
	z.object({
		status: z.literal("finished"),
		submissionStatus: z.enum(["submitted", "forfeited"]),
	}),
]);

// --- submit ---

export const SubmitQuizInputSchema = z.object({
	slug: z.string().min(1),
	answers: z
		.array(
			z
				.number()
				.int()
				.min(-1)
				.max(QUIZ_CHOICE_COUNT - 1),
		)
		.length(QUIZ_QUESTION_COUNT),
});

export const SubmitQuizOutputSchema = z.object({
	status: z.enum(["submitted", "forfeited"]),
});

// --- results ---

const QuizReviewQuestionSchema = z.object({
	position: z.number().int(),
	question: z.string(),
	explanation: z.string(),
	difficulty: z.string(),
	pointsCorrect: z.number().int(),
	pointsWrong: z.number().int(),
	choices: z.array(z.object({ text: z.string(), isCorrect: z.boolean() })),
	/** Chosen index, -1 = skipped. */
	myAnswer: z.number().int(),
	/** Points this answer earned or cost. */
	earned: z.number().int(),
	reported: z.boolean(),
});

const QuizLeaderboardRowSchema = z.object({
	rank: z.number().int().min(1),
	user: QuizPersonSchema,
	score: z.number().int(),
	correct: z.number().int(),
	incorrect: z.number().int(),
	skipped: z.number().int(),
	submittedAt: z.coerce.date(),
	isMe: z.boolean(),
});

export const GetQuizResultsInputSchema = SlugInput;
export const GetQuizResultsOutputSchema = z.object({
	book: QuizBookSchema,
	status: z.enum(["submitted", "forfeited"]),
	me: z
		.object({
			score: z.number().int(),
			correct: z.number().int(),
			incorrect: z.number().int(),
			skipped: z.number().int(),
			rank: z.number().int().min(1),
			/** Share of other readers this score beat, 0–100; null when alone. */
			beatPercent: z.number().int().min(0).max(100).nullable(),
			submittedAt: z.coerce.date(),
		})
		.nullable(),
	participantCount: z.number().int().min(0),
	maxScore: z.number().int(),
	minScore: z.number().int(),
	/** Empty for a forfeited attempt. */
	questions: z.array(QuizReviewQuestionSchema),
	leaderboard: z.array(QuizLeaderboardRowSchema),
	/** The viewer's own row when they fall outside the shown top ranks. */
	myRow: QuizLeaderboardRowSchema.nullable(),
	distribution: z.array(
		z.object({ score: z.number().int(), count: z.number().int() }),
	),
	questionStats: z.array(
		z.object({
			position: z.number().int(),
			difficulty: z.string(),
			correctPercent: z.number().int().min(0).max(100),
			answered: z.number().int(),
		}),
	),
});

// --- review (owner / admin replay) ---

export const GetQuizReviewInputSchema = z.object({
	slug: z.string().min(1),
	username: z.string().min(1),
});
export const GetQuizReviewOutputSchema = z.object({
	book: QuizBookSchema,
	score: z.number().int(),
	correct: z.number().int(),
	incorrect: z.number().int(),
	skipped: z.number().int(),
	submittedAt: z.coerce.date(),
	questions: z.array(QuizReviewQuestionSchema),
});

// --- report ---

export const ReportQuizQuestionInputSchema = z.object({
	slug: z.string().min(1),
	position: z.number().int().min(1).max(QUIZ_QUESTION_COUNT),
	reason: z.string().trim().max(500).optional(),
});
export const ReportQuizQuestionOutputSchema = z.object({ ok: z.literal(true) });

// --- lists ---

const QuizListSortSchema = z.object({
	sortBy: z.enum(["submittedAt", "score"]).default("submittedAt"),
	sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const ListBookQuizSubmissionsInputSchema =
	OffsetPaginationInputSchema.extend({
		slug: z.string().min(1),
		search: z.string().trim().max(100).optional(),
	}).extend(QuizListSortSchema.shape);

export const BookQuizSubmissionRowSchema = z.object({
	rank: z.number().int().min(1),
	user: QuizPersonSchema,
	score: z.number().int(),
	correct: z.number().int(),
	incorrect: z.number().int(),
	skipped: z.number().int(),
	submittedAt: z.coerce.date(),
});

export const ListBookQuizSubmissionsOutputSchema = z.object({
	book: QuizBookSchema,
	items: z.array(BookQuizSubmissionRowSchema),
	metadata: OffsetPaginationMetadataSchema,
});

export const ListUserQuizzesInputSchema = OffsetPaginationInputSchema.extend({
	username: z.string().min(1),
	search: z.string().trim().max(100).optional(),
	status: z.enum(["submitted", "forfeited"]).optional(),
}).extend(QuizListSortSchema.shape);

export const UserQuizRowSchema = z.object({
	id: z.string(),
	status: QuizSubmissionStatusSchema,
	book: QuizBookSchema,
	score: z.number().int().nullable(),
	correct: z.number().int(),
	incorrect: z.number().int(),
	skipped: z.number().int(),
	rank: z.number().int().nullable(),
	participantCount: z.number().int(),
	submittedAt: z.coerce.date().nullable(),
	startedAt: z.coerce.date(),
});

export const ListUserQuizzesOutputSchema = z.object({
	items: z.array(UserQuizRowSchema),
	metadata: OffsetPaginationMetadataSchema,
	/** True when the viewer may open the replay (owner or admin). */
	canReview: z.boolean(),
});

// --- admin ---

export const AdminQuizIdInputSchema = z.object({ quizId: z.string().min(1) });
export const AdminQuizActionOutputSchema = z.object({ ok: z.literal(true) });

export type GetQuizEntryStateOutput = z.infer<
	typeof GetQuizEntryStateOutputSchema
>;
export type StartQuizOutput = z.infer<typeof StartQuizOutputSchema>;
export type GetQuizResultsOutput = z.infer<typeof GetQuizResultsOutputSchema>;
export type GetQuizReviewOutput = z.infer<typeof GetQuizReviewOutputSchema>;
export type ListBookQuizSubmissionsOutput = z.infer<
	typeof ListBookQuizSubmissionsOutputSchema
>;
export type ListUserQuizzesOutput = z.infer<typeof ListUserQuizzesOutputSchema>;
export type QuizReviewQuestion = z.infer<typeof QuizReviewQuestionSchema>;
export type QuizPlayQuestion = z.infer<typeof QuizPlayQuestionSchema>;
