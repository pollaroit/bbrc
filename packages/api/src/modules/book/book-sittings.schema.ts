import { ProgressSchema } from "@bbrc/schemas";
import zod from "zod";

const CountSchema = zod.number().int().min(0);

const RankedBookSchema = zod.object({
	slug: zod.string(),
	title: zod.string(),
	authors: zod.array(zod.string()),
	coverId: zod.number().int().nullable(),
});

export const GetBookSittingsInputSchema = zod.object({
	bookSlug: zod.string().min(1),
});

export const BookSittingOutcomeSchema = zod.enum([
	"picked",
	"not_picked",
	"in_poll",
]);

export const BookSittingItemSchema = zod.object({
	sittingSlug: zod.string(),
	displayName: zod.string(),
	status: zod.enum(["voting", "reading", "finished"]),
	outcome: BookSittingOutcomeSchema,
	/** Poll deadline when there is a poll, otherwise when the sitting started. */
	date: zod.string(),
	year: zod.number().int(),
	readingStartedAt: zod.string().nullable(),
	readingDeadline: zod.string().nullable(),
	pollDeadline: zod.string().nullable(),
	/** Closed polls only. */
	place: zod.number().int().min(1).nullable(),
	points: CountSchema.nullable(),
	/** Members who voted in the poll (any option). */
	voters: CountSchema,
	optionCount: CountSchema,
	/** Short line on how the poll went, for example "Won by 3 points". */
	note: zod.string().nullable(),
	winner: RankedBookSchema.extend({ points: CountSchema }).nullable(),
	/** Closed polls only; hidden while voting is open. */
	ranking: zod.array(
		RankedBookSchema.extend({
			place: zod.number().int().min(1),
			points: CountSchema,
			voters: CountSchema,
			isThisBook: zod.boolean(),
			isPicked: zod.boolean(),
		}),
	),
	participantCount: CountSchema,
	progressCounts: zod.object({
		not_started: CountSchema,
		in_progress: CountSchema,
		completed: CountSchema,
		dnf: CountSchema,
	}),
	participants: zod.array(
		zod.object({
			username: zod.string(),
			name: zod.string(),
			image: zod.string().nullable(),
			progress: ProgressSchema,
		}),
	),
});

export const GetBookSittingsOutputSchema = zod.object({
	summary: zod.object({
		picked: CountSchema,
		pollAppearances: CountSchema,
		closedPolls: CountSchema,
		inPollNow: CountSchema,
		/** Share of closed polls the book was picked in, 0 to 1. */
		winRate: zod.number().nullable(),
		bestPlace: zod.number().int().nullable(),
		averagePlace: zod.number().nullable(),
		readers: CountSchema,
	}),
	rivals: zod.array(
		RankedBookSchema.extend({
			/** Polls where that book finished ahead of this one. */
			ahead: CountSchema,
			/** Polls where this book finished ahead of that one. */
			behind: CountSchema,
		}),
	),
	items: zod.array(BookSittingItemSchema),
});

export type GetBookSittingsOutput = zod.infer<
	typeof GetBookSittingsOutputSchema
>;
export type BookSittingItem = zod.infer<typeof BookSittingItemSchema>;

export const GetMyBookSittingMarksOutputSchema = zod.array(
	zod.object({
		sittingSlug: zod.string(),
		/** Points you gave this book in that poll, null when you did not pick it. */
		myPoints: zod.number().int().nullable(),
		/** True when you voted in that poll at all. */
		voted: zod.boolean(),
		myProgress: ProgressSchema.nullable(),
	}),
);

export type GetMyBookSittingMarksOutput = zod.infer<
	typeof GetMyBookSittingMarksOutputSchema
>;
