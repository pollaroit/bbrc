import zod from "zod";

const MonthSchema = zod.object({
	year: zod.number().int(),
	month: zod.number().int().min(1).max(12),
});

const CountSchema = zod.number().int().min(0);

export const GetBookStatsInputSchema = zod.object({
	bookSlug: zod.string().min(1),
});

export const GetBookStatsOutputSchema = zod.object({
	book: zod.object({
		slug: zod.string(),
		title: zod.string(),
		pages: zod.number().int(),
		openLibraryRating: zod.number().nullable(),
	}),
	asOf: zod.string(),
	totals: zod.object({
		readers: CountSchema,
		reviews: CountSchema,
		clubRating: zod.number().nullable(),
		libraryAverageRating: zod.number().nullable(),
		favorites: CountSchema,
		shelves: CountSchema,
		quizTakers: CountSchema,
		quizAverageScore: zod.number().nullable(),
		pagesReadTogether: CountSchema,
	}),
	reads: zod.object({
		dated: CountSchema,
		undated: CountSchema,
		firstFinish: MonthSchema.nullable(),
		lastFinish: MonthSchema.nullable(),
		monthly: zod.array(
			MonthSchema.extend({ dated: CountSchema, undated: CountSchema }),
		),
		editions: zod.array(zod.object({ olid: zod.string(), count: CountSchema })),
	}),
	ratings: zod.object({
		average: zod.number().nullable(),
		median: zod.number().nullable(),
		histogram: zod.array(
			zod.object({ step: zod.number(), count: CountSchema }),
		),
		monthly: zod.array(
			MonthSchema.extend({
				average: zod.number().nullable(),
				cumulativeCount: CountSchema,
				newCount: CountSchema,
			}),
		),
		withText: CountSchema,
		spoilers: CountSchema,
		likes: CountSchema,
		comments: CountSchema,
		topReview: zod
			.object({
				slug: zod.string(),
				rating: zod.number(),
				likes: CountSchema,
				comments: CountSchema,
				author: zod.object({ username: zod.string(), name: zod.string() }),
			})
			.nullable(),
	}),
	audience: zod.object({
		members: CountSchema,
		read: CountSchema,
		readingNow: CountSchema,
		notRead: CountSchema,
	}),
	polls: zod.object({
		appearances: CountSchema,
		closed: CountSchema,
		chosen: CountSchema,
		openNowSittingSlug: zod.string().nullable(),
		averageRank: zod.number().nullable(),
		averagePoints: zod.number().nullable(),
		entries: zod.array(
			zod.object({
				sittingSlug: zod.string(),
				date: zod.string(),
				rank: zod.number().int().min(1),
				optionCount: zod.number().int().min(1),
				points: CountSchema,
				voters: CountSchema,
				chosen: zod.boolean(),
			}),
		),
	}),
	collections: zod.object({
		monthly: zod.array(
			MonthSchema.extend({ favorites: CountSchema, shelves: CountSchema }),
		),
	}),
	sittings: zod.object({
		count: CountSchema,
		joined: CountSchema,
		started: CountSchema,
		completed: CountSchema,
		dnf: CountSchema,
		medianFinishDays: zod.number().nullable(),
		finishDays: zod.array(
			zod.object({ label: zod.string(), count: CountSchema }),
		),
	}),
	quiz: zod
		.object({
			takers: CountSchema,
			averageScore: zod.number().nullable(),
			minScore: zod.number().int(),
			maxScore: zod.number().int(),
			scores: zod.array(
				zod.object({ label: zod.string(), count: CountSchema }),
			),
			questions: zod.array(
				zod.object({
					position: zod.number().int(),
					label: zod.string(),
					correct: CountSchema,
					wrong: CountSchema,
					skipped: CountSchema,
				}),
			),
		})
		.nullable(),
});

export type GetBookStatsOutput = zod.infer<typeof GetBookStatsOutputSchema>;
