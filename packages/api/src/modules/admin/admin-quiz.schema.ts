import {
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import {
	adminQuizListFiltersSchema,
	adminQuizListRanging,
	adminQuizListSearching,
	adminQuizListSorting,
	adminQuizStatuses,
} from "./admin-quiz.listing";

const QuizStatusSchema = z.enum(adminQuizStatuses);

const refineRange = (
	value: { rangeMin?: Date; rangeMax?: Date },
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);
};

const AdminQuizPersonSchema = z.object({
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
});

const AdminQuizBookSchema = z.object({
	slug: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	coverId: z.number().int().nullable(),
});

export const AdminQuizRankingItemSchema = z.object({
	quizId: z.string(),
	bookSlug: z.string(),
	title: z.string(),
	status: QuizStatusSchema,
	metric: z.number(),
	secondaryMetric: z.number().optional(),
});

export const AdminQuizOverviewOutputSchema = z.object({
	kpis: z.object({
		totalQuizzes: z.number().int().min(0),
		ready: z.number().int().min(0),
		unavailable: z.number().int().min(0),
		generating: z.number().int().min(0),
		submittedAttempts: z.number().int().min(0),
		forfeitedAttempts: z.number().int().min(0),
		inProgressAttempts: z.number().int().min(0),
		averageScore: z.number().nullable(),
		quizzesWithReports: z.number().int().min(0),
		totalReports: z.number().int().min(0),
		createdLast7Days: z.number().int().min(0),
		createdLast30Days: z.number().int().min(0),
		/** Generation requests in the last 24h, across all books. */
		generationsLast24h: z.number().int().min(0),
		failedGenerationsLast24h: z.number().int().min(0),
	}),
	quizzesByDay: z.array(
		z.object({ date: z.string(), count: z.number().int().min(0) }),
	),
	rankings: z.object({
		mostAttempted: z.array(AdminQuizRankingItemSchema),
		mostReported: z.array(AdminQuizRankingItemSchema),
		highestAverageScore: z.array(AdminQuizRankingItemSchema),
		lowestAverageScore: z.array(AdminQuizRankingItemSchema),
		recentlyGenerated: z.array(AdminQuizRankingItemSchema),
		topGenerators: z.array(
			z.object({
				username: z.string(),
				name: z.string(),
				count: z.number().int().min(0),
			}),
		),
	}),
});

export type AdminQuizOverviewOutput = z.infer<
	typeof AdminQuizOverviewOutputSchema
>;

export const GetAdminQuizOverviewInputSchema = adminQuizListFiltersSchema
	.extend(adminQuizListRanging.inputSchema.shape)
	.extend(adminQuizListSearching.inputSchema.shape)
	.partial()
	.superRefine(refineRange)
	.default({});

export type GetAdminQuizOverviewInput = z.infer<
	typeof GetAdminQuizOverviewInputSchema
>;

export const ListAdminQuizzesInputSchema = adminQuizListFiltersSchema
	.extend(adminQuizListSorting.inputSchema.shape)
	.extend(adminQuizListRanging.inputSchema.shape)
	.extend(adminQuizListSearching.inputSchema.shape)
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(refineRange);

export type ListAdminQuizzesInput = z.infer<typeof ListAdminQuizzesInputSchema>;

export const AdminQuizListItemSchema = z.object({
	id: z.string(),
	status: QuizStatusSchema,
	book: AdminQuizBookSchema,
	generatedBy: AdminQuizPersonSchema.nullable(),
	model: z.string().nullable(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	unavailableUntil: z.coerce.date().nullable(),
	counts: z.object({
		submitted: z.number().int().min(0),
		forfeited: z.number().int().min(0),
		inProgress: z.number().int().min(0),
		reports: z.number().int().min(0),
	}),
	averageScore: z.number().nullable(),
	reportedQuestions: z.array(
		z.object({
			position: z.number().int(),
			question: z.string(),
			count: z.number().int(),
			reasons: z.array(z.string()),
		}),
	),
});

export const ListAdminQuizzesOutputSchema = OffsetPaginationOutputSchema(
	AdminQuizListItemSchema,
);

export type ListAdminQuizzesOutput = z.infer<
	typeof ListAdminQuizzesOutputSchema
>;

export const GetAdminQuizStatsInputSchema = adminQuizListFiltersSchema
	.extend(adminQuizListRanging.inputSchema.shape)
	.partial()
	.default({});

export type GetAdminQuizStatsInput = z.infer<
	typeof GetAdminQuizStatsInputSchema
>;

export const GetAdminQuizStatsOutputSchema = z.object({
	statusDistribution: z.array(
		z.object({ status: QuizStatusSchema, count: z.number().int().min(0) }),
	),
	generationOutcomes: z.array(
		z.object({
			outcome: z.enum(["ready", "declined", "failed"]),
			count: z.number().int().min(0),
		}),
	),
	generationsByDay: z.array(
		z.object({
			date: z.string(),
			ready: z.number().int().min(0),
			declined: z.number().int().min(0),
			failed: z.number().int().min(0),
		}),
	),
	attemptsByDay: z.array(
		z.object({
			date: z.string(),
			submitted: z.number().int().min(0),
			forfeited: z.number().int().min(0),
		}),
	),
	scoreDistribution: z.array(
		z.object({ score: z.number().int(), count: z.number().int().min(0) }),
	),
	questionDifficulty: z.array(
		z.object({
			position: z.number().int(),
			label: z.string(),
			correctPercent: z.number().int().min(0).max(100),
			wrongPercent: z.number().int().min(0).max(100),
			skippedPercent: z.number().int().min(0).max(100),
		}),
	),
	attemptsPerQuiz: z.array(
		z.object({ label: z.string(), value: z.number().int().min(0) }),
	),
	funnel: z.array(
		z.object({ stage: z.string(), count: z.number().int().min(0) }),
	),
});

export type GetAdminQuizStatsOutput = z.infer<
	typeof GetAdminQuizStatsOutputSchema
>;
