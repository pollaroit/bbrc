import {
	BookSchema,
	BookStatusSchema,
	OffsetPaginationInputSchema,
	OffsetPaginationOutputSchema,
} from "@bbrc/schemas";
import { refineRangingBounds } from "@bbrc/schemas/listing/ranging";
import z from "zod";
import { BookRequestedBySchema } from "../book/book.schema";
import {
	adminBookListFiltersSchema,
	adminBookListRanging,
	adminBookListSearching,
	adminBookListSorting,
} from "./admin-book.listing";

export const AdminBookRankingItemSchema = z.object({
	slug: BookSchema.shape.slug,
	title: BookSchema.shape.title,
	coverId: BookSchema.shape.coverId,
	metric: z.number(),
	secondaryMetric: z.number().optional(),
});

export const AdminAuthorRankingItemSchema = z.object({
	authorName: z.string(),
	authorSlug: z.string(),
	bookCount: z.number().int().min(0),
});

export const AdminBookOverviewOutputSchema = z.object({
	kpis: z.object({
		totalBooks: z.number().int().min(0),
		distinctAuthors: z.number().int().min(0),
		averagePages: z.number().min(0),
		totalPages: z.number().int().min(0),
		statusCounts: z.object({
			completed: z.number().int().min(0),
			reading: z.number().int().min(0),
			wishlist: z.number().int().min(0),
		}),
		addedLast7Days: z.number().int().min(0),
		addedLast30Days: z.number().int().min(0),
		pendingBookRequests: z.number().int().min(0),
		blockedOpenLibraryWorks: z.number().int().min(0),
	}),
	additionsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	rankings: z.object({
		mostFavorited: z.array(AdminBookRankingItemSchema),
		longest: z.array(AdminBookRankingItemSchema),
		shortest: z.array(AdminBookRankingItemSchema),
		earliestPublished: z.array(AdminBookRankingItemSchema),
		newestPublished: z.array(AdminBookRankingItemSchema),
		authorsByCatalogSize: z.array(AdminAuthorRankingItemSchema),
		openLibraryRating: z.array(AdminBookRankingItemSchema),
		clubAverageRating: z.array(AdminBookRankingItemSchema),
		mostShelved: z.array(AdminBookRankingItemSchema),
		mostPollVotes: z.array(AdminBookRankingItemSchema),
		mostFeedbacks: z.array(AdminBookRankingItemSchema),
		mostPostAttachments: z.array(AdminBookRankingItemSchema),
	}),
});

export type AdminBookOverviewOutput = z.infer<
	typeof AdminBookOverviewOutputSchema
>;

export const adminBookListQueryShape = adminBookListFiltersSchema
	.extend(adminBookListSorting.inputSchema.shape)
	.extend(adminBookListRanging.inputSchema.shape)
	.extend(adminBookListSearching.inputSchema.shape);

const adminBookListQueryRefine = (
	value: {
		rangeMin?: Date;
		rangeMax?: Date;
		minOpenLibraryRating?: number;
		maxOpenLibraryRating?: number;
		minAverageRating?: number;
		maxAverageRating?: number;
		minPages?: number;
		maxPages?: number;
	},
	ctx: z.RefinementCtx,
) => {
	refineRangingBounds(
		{ rangeMin: value.rangeMin, rangeMax: value.rangeMax },
		ctx,
	);

	if (
		value.maxOpenLibraryRating != null &&
		value.minOpenLibraryRating != null &&
		value.maxOpenLibraryRating < value.minOpenLibraryRating
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Maximum Open Library rating must be greater than or equal to minimum",
			path: ["maxOpenLibraryRating"],
		});
	}

	if (
		value.maxPages != null &&
		value.minPages != null &&
		value.maxPages < value.minPages
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum pages must be greater than or equal to minimum",
			path: ["maxPages"],
		});
	}

	if (
		value.maxAverageRating != null &&
		value.minAverageRating != null &&
		value.maxAverageRating < value.minAverageRating
	) {
		ctx.addIssue({
			code: "custom",
			message: "Maximum club rating must be greater than or equal to minimum",
			path: ["maxAverageRating"],
		});
	}
};

export const GetAdminBookOverviewInputSchema = adminBookListFiltersSchema
	.extend(adminBookListRanging.inputSchema.shape)
	.extend(adminBookListSearching.inputSchema.shape)
	.partial()
	.superRefine(adminBookListQueryRefine)
	.default({});

export type GetAdminBookOverviewInput = z.infer<
	typeof GetAdminBookOverviewInputSchema
>;

export const ListAdminBooksInputSchema = adminBookListQueryShape
	.extend(OffsetPaginationInputSchema.shape)
	.superRefine(adminBookListQueryRefine);

export const AdminBookListCountsSchema = z.object({
	favorites: z.number().int().min(0),
	feedbacks: z.number().int().min(0),
	shelfBooks: z.number().int().min(0),
	postAttachments: z.number().int().min(0),
	pollOptions: z.number().int().min(0),
	pollVotes: z.number().int().min(0),
});

export const AdminBookListItemSchema = BookSchema.pick({
	id: true,
	slug: true,
	title: true,
	authors: true,
	pages: true,
	status: true,
	openLibraryRating: true,
	publishedIn: true,
	averageRating: true,
	coverId: true,
	olid: true,
	createdAt: true,
	updatedAt: true,
}).extend({
	excerptPreview: z.string().nullable(),
	requestedBy: BookRequestedBySchema.nullable(),
	approvedBy: BookRequestedBySchema.nullable(),
	counts: AdminBookListCountsSchema,
	latestSittingSlug: z.string().nullable(),
});

export const ListAdminBooksOutputSchema = OffsetPaginationOutputSchema(
	AdminBookListItemSchema,
);

export type ListAdminBooksInput = z.infer<typeof ListAdminBooksInputSchema>;
export type ListAdminBooksOutput = z.infer<typeof ListAdminBooksOutputSchema>;

export const GetAdminBookStatsInputSchema = z
	.object({
		statuses: z.array(BookStatusSchema).optional(),
		authors: adminBookListFiltersSchema.shape.authors,
		rangeMin: z.coerce.date().optional(),
		rangeMax: z.coerce.date().optional(),
	})
	.partial()
	.default({});

export const AdminBookStatsPointSchema = z.object({
	label: z.string(),
	value: z.number(),
});

export const GetAdminBookStatsOutputSchema = z.object({
	statusDistribution: z.array(
		z.object({
			status: BookStatusSchema,
			count: z.number().int().min(0),
		}),
	),
	additionsByDay: z.array(
		z.object({
			date: z.string(),
			count: z.number().int().min(0),
		}),
	),
	pagesHistogram: z.array(AdminBookStatsPointSchema),
	publishedByDecade: z.array(AdminBookStatsPointSchema),
	ratingBuckets: z.array(
		z.object({
			bucket: z.string(),
			openLibrary: z.number().int().min(0),
			club: z.number().int().min(0),
		}),
	),
	engagementFunnel: z.array(
		z.object({
			stage: z.string(),
			count: z.number().int().min(0),
		}),
	),
	sittingInvolvement: z.array(
		z.object({
			kind: z.string(),
			count: z.number().int().min(0),
		}),
	),
});

export type GetAdminBookStatsInput = z.infer<
	typeof GetAdminBookStatsInputSchema
>;
export type GetAdminBookStatsOutput = z.infer<
	typeof GetAdminBookStatsOutputSchema
>;

export const adminBookListSelect = {
	id: true,
	slug: true,
	title: true,
	authors: true,
	pages: true,
	status: true,
	openLibraryRating: true,
	publishedIn: true,
	averageRating: true,
	coverId: true,
	olid: true,
	excerpt: true,
	createdAt: true,
	updatedAt: true,
	requestedBy: {
		select: { username: true, name: true },
	},
	approvedBy: {
		select: { username: true, name: true },
	},
	_count: {
		select: {
			favorites: true,
			feedbacks: true,
			shelfBooks: true,
			postAttachments: true,
			polls: true,
		},
	},
} as const;
