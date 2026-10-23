import { CursorPaginationInputSchema, ProgressSchema } from "@bbrc/schemas";
import zod from "zod";
import { MemberLevelSchema } from "../user/user.schema";

export const PEOPLE_SORT_FIELDS = [
	"xp",
	"rp",
	"name",
	"createdAt",
	"streak",
	"reads",
	"feedbacks",
	"posts",
	"participations",
	"shelves",
	"favorites",
	"quizzes",
	"documents",
] as const;

export const PEOPLE_ACTIVITY_FILTERS = [
	"readingNow",
	"hasStreak",
	"hasReviews",
	"hasPosts",
	"hasShelves",
	"hasFavorites",
	"tookQuiz",
	"hasGoal",
	"contributedDocuments",
	"hasBio",
	"hasAvatar",
] as const;

export const PEOPLE_STATUSES = ["active", "warned", "banned"] as const;

export const GetPeopleListInputSchema = CursorPaginationInputSchema.extend({
	search: zod.string().trim().max(100).optional(),
	sortBy: zod.enum(PEOPLE_SORT_FIELDS).default("xp"),
	sortDirection: zod.enum(["asc", "desc"]).default("desc"),
	isAdmin: zod.boolean().optional(),
	/** Only honoured for administrators; everyone else never sees banned members. */
	statuses: zod.array(zod.enum(PEOPLE_STATUSES)).optional(),
	xpLevels: zod.array(zod.string().max(40)).optional(),
	rpLevels: zod.array(zod.string().max(40)).optional(),
	rangeMin: zod.coerce.date().optional(),
	rangeMax: zod.coerce.date().optional(),
	genres: zod.array(zod.string().max(60)).max(12).optional(),
	location: zod.string().trim().max(80).optional(),
	/** Members who read every one of these books (book slugs). */
	readBooks: zod.array(zod.string().max(80)).max(6).optional(),
	minReads: zod.number().int().min(1).max(10000).optional(),
	minReviews: zod.number().int().min(1).max(10000).optional(),
	minSittings: zod.number().int().min(1).max(1000).optional(),
	readingNow: zod.boolean().optional(),
	hasStreak: zod.boolean().optional(),
	hasReviews: zod.boolean().optional(),
	hasPosts: zod.boolean().optional(),
	hasShelves: zod.boolean().optional(),
	hasFavorites: zod.boolean().optional(),
	tookQuiz: zod.boolean().optional(),
	hasGoal: zod.boolean().optional(),
	contributedDocuments: zod.boolean().optional(),
	hasBio: zod.boolean().optional(),
	hasAvatar: zod.boolean().optional(),
});

export const PeopleListItemSchema = zod.object({
	id: zod.string(),
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
	status: zod.enum(PEOPLE_STATUSES),
	isAdmin: zod.boolean(),
	createdAt: zod.string(),
	xp: zod.number().int(),
	rp: zod.number().int(),
	xpLevel: MemberLevelSchema,
	rpLevel: MemberLevelSchema,
	bio: zod.string().nullable(),
	location: zod.string().nullable(),
	favoriteGenres: zod.array(zod.string()),
	reads: zod.number().int().min(0),
	reviews: zod.number().int().min(0),
	posts: zod.number().int().min(0),
	sittingsFinished: zod.number().int().min(0),
	streak: zod.object({
		current: zod.number().int().min(0),
		best: zod.number().int().min(0),
	}),
	averageRatingGiven: zod.number().nullable(),
	/** The sitting they are reading right now, if any. */
	readingNow: zod
		.object({ sittingSlug: zod.string(), progress: ProgressSchema })
		.nullable(),
});

export const GetPeopleListOutputSchema = zod.object({
	items: zod.array(PeopleListItemSchema),
	metadata: zod.object({
		limit: zod.number().int(),
		hasNextPage: zod.boolean(),
		hasPreviousPage: zod.boolean(),
		nextCursor: zod.string().nullable(),
	}),
	/** Members matching the filters (before paging). */
	total: zod.number().int().min(0),
});

export const GetPeopleOverviewOutputSchema = zod.object({
	total: zod.number().int().min(0),
	activeLast30Days: zod.number().int().min(0),
	newest: zod
		.object({
			name: zod.string(),
			username: zod.string(),
			createdAt: zod.string(),
		})
		.nullable(),
});

export type GetPeopleListInput = zod.infer<typeof GetPeopleListInputSchema>;
export type GetPeopleListOutput = zod.infer<typeof GetPeopleListOutputSchema>;
export type PeopleListItem = zod.infer<typeof PeopleListItemSchema>;
export type GetPeopleOverviewOutput = zod.infer<
	typeof GetPeopleOverviewOutputSchema
>;
