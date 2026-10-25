import {
	INSIGHT_RANGES,
	VIEW_BATCH_MAX,
	VIEW_KINDS,
	VIEW_RESOURCES,
	VIEW_SOURCES,
} from "@bbrc/shared";
import type { z } from "zod";
import zod from "zod";

export const ViewResourceSchema = zod.enum(VIEW_RESOURCES);
export const ViewKindSchema = zod.enum(VIEW_KINDS);
export const ViewSourceSchema = zod.enum(VIEW_SOURCES);
export const InsightRangeSchema = zod.enum(INSIGHT_RANGES);

/**
 * `ref` is the public name of the thing: a slug, a username, or
 * `username/slug` for a shelf.
 */
export const RecordViewItemSchema = zod.object({
	resource: ViewResourceSchema,
	ref: zod.string().min(1).max(200),
	kind: ViewKindSchema,
	source: ViewSourceSchema,
});
export type RecordViewItem = z.infer<typeof RecordViewItemSchema>;

export const RecordViewsInputSchema = zod.object({
	items: zod.array(RecordViewItemSchema).min(1).max(VIEW_BATCH_MAX),
});

/** What the browser sends: the views plus its own random id and referrer host. */
export const RecordViewsRequestSchema = RecordViewsInputSchema.extend({
	visitorId: zod
		.string()
		.regex(/^[A-Za-z0-9-]{16,64}$/)
		.optional(),
	referrerHost: zod.string().max(253).nullish(),
});

// ── Insights ───────────────────────────────────────────────────────────────

export const InsightsInputSchema = zod.object({
	resource: ViewResourceSchema,
	ref: zod.string().min(1).max(200),
	range: InsightRangeSchema.default("30d"),
});

const Count = zod.number().int();

export const InsightTotalsSchema = zod.object({
	/** Times the item's own page was opened. */
	opens: Count,
	/** Times it showed up in a list. */
	impressions: Count,
	/** Opens divided by impressions, as a percentage; null with no impressions. */
	openRate: zod.number().nullable(),
	uniqueViewers: Count,
	memberViewers: Count,
	guestViewers: Count,
});

export const InsightBreakdownRowSchema = zod.object({
	key: zod.string(),
	label: zod.string(),
	views: Count,
});

export const InsightSeriesPointSchema = zod.object({
	/** Club-local day, `YYYY-MM-DD`. */
	day: zod.string(),
	opens: Count,
	impressions: Count,
	uniqueViewers: Count,
});

export const InsightViewerSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
	views: Count,
	firstSeenAt: zod.coerce.date(),
	lastSeenAt: zod.coerce.date(),
});

export const InsightSlotSchema = zod.object({
	weekday: Count,
	hour: Count,
	views: Count,
});

export const InsightsOutputSchema = zod.object({
	resource: ViewResourceSchema,
	ref: zod.string(),
	title: zod.string(),
	href: zod.string(),
	range: InsightRangeSchema,
	/** Start of the range (the first day shown); null for "all" with no data yet. */
	since: zod.coerce.date().nullable(),
	/** Names of signed-in viewers are shown to this viewer. */
	canSeeViewers: zod.boolean(),
	totals: InsightTotalsSchema,
	/** The same figures for the period just before; only for 7 and 30 days. */
	previous: InsightTotalsSchema.nullable(),
	series: zod.array(InsightSeriesPointSchema),
	/** Views by weekday (Monday first) and hour, over the last 90 days. */
	heatmap: zod.array(zod.array(Count)).length(7),
	bestSlots: zod.array(InsightSlotSchema),
	sources: zod.array(InsightBreakdownRowSchema),
	devices: zod.array(InsightBreakdownRowSchema),
	browsers: zod.array(InsightBreakdownRowSchema),
	systems: zod.array(InsightBreakdownRowSchema),
	countries: zod.array(InsightBreakdownRowSchema),
	audience: zod.object({
		newMembers: Count,
		returningMembers: Count,
		newGuests: Count,
		returningGuests: Count,
	}),
	/** Signed-in members who looked, most views first. Null when hidden from this viewer. */
	topViewers: zod.array(InsightViewerSchema).nullable(),
	recentViewers: zod.array(InsightViewerSchema).nullable(),
	comparison: zod
		.object({
			/** Average opens of items of this kind that were opened at all. */
			averageOpens: zod.number(),
			/** This item's opens divided by the average. */
			ratio: zod.number().nullable(),
			rank: Count,
			outOf: Count,
			days: Count,
		})
		.nullable(),
	engagement: zod
		.object({
			likes: Count,
			comments: Count,
			shares: Count,
			/** Likes, comments and shares per 100 opens; null with no opens. */
			rate: zod.number().nullable(),
		})
		.nullable(),
	funnel: zod
		.object({
			viewers: Count,
			onShelves: Count,
			reads: Count,
			favourites: Count,
			reviews: Count,
		})
		.nullable(),
	/** Other websites that sent people here (last 90 days). */
	referrers: zod.array(InsightBreakdownRowSchema),
	/** Per place people came from: glances in lists vs opens. */
	sourceFunnel: zod.array(
		zod.object({
			key: zod.string(),
			label: zod.string(),
			impressions: Count,
			opens: Count,
		}),
	),
	/** How many times each viewer opened it. */
	loyalty: zod.object({
		once: Count,
		twice: Count,
		threeToFive: Count,
		sixOrMore: Count,
	}),
	/** Opens in the first day, three days and week after it was published. */
	lifecycle: zod
		.object({
			publishedAt: zod.coerce.date(),
			firstDay: Count,
			firstThreeDays: Count,
			firstWeek: Count,
			total: Count,
		})
		.nullable(),
	/** Posts that quoted or attached this item. */
	mentions: zod.object({
		total: Count,
		recent: zod.array(
			zod.object({
				href: zod.string(),
				username: zod.string(),
				name: zod.string(),
				at: zod.coerce.date(),
			}),
		),
	}),
	/** How many of the club's members have looked at it. */
	reach: zod.object({ viewers: Count, members: Count }),
	/** Against the author's other posts, reviews or shelves (all-time opens). */
	ownComparison: zod
		.object({
			averageOpens: zod.number(),
			rank: Count,
			outOf: Count,
		})
		.nullable(),
	/** True when part of the figures are summed from days older than 90 days. */
	approximate: zod.boolean(),
	/** Total opens ever (for the public count). */
	allTimeOpens: Count,
});
export type ViewInsights = z.infer<typeof InsightsOutputSchema>;

// ── Counts, trending and admin ─────────────────────────────────────────────

export const ViewCountsInputSchema = zod.object({
	resource: zod.enum(["post", "book"]),
	refs: zod.array(zod.string().min(1).max(200)).min(1).max(60),
});
export const ViewCountsOutputSchema = zod.object({
	/** Opens by ref, never counting the owner or bots. */
	counts: zod.record(zod.string(), Count),
});
export type ViewCounts = z.infer<typeof ViewCountsOutputSchema>;

export const TrendingInputSchema = zod.object({
	resource: zod.enum(["post", "book"]),
	days: zod.number().int().min(1).max(30).default(7),
	limit: zod.number().int().min(1).max(12).default(6),
});
export const TrendingOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			ref: zod.string(),
			href: zod.string(),
			title: zod.string(),
			subtitle: zod.string().nullable(),
			coverId: zod.number().int().nullable(),
			views: Count,
		}),
	),
});
export type Trending = z.infer<typeof TrendingOutputSchema>;

export const AdminOverviewInputSchema = zod.object({
	range: zod.enum(["7d", "30d", "90d"]).default("30d"),
});
export const AdminOverviewOutputSchema = zod.object({
	range: zod.enum(["7d", "30d", "90d"]),
	totals: InsightTotalsSchema,
	series: zod.array(InsightSeriesPointSchema),
	botsDropped: Count,
	byResource: zod.array(
		zod.object({
			resource: ViewResourceSchema,
			opens: Count,
			impressions: Count,
		}),
	),
	top: zod.array(
		zod.object({
			resource: ViewResourceSchema,
			items: zod.array(
				zod.object({
					ref: zod.string(),
					href: zod.string(),
					title: zod.string(),
					views: Count,
				}),
			),
		}),
	),
	sources: zod.array(InsightBreakdownRowSchema),
	devices: zod.array(InsightBreakdownRowSchema),
	browsers: zod.array(InsightBreakdownRowSchema),
	countries: zod.array(InsightBreakdownRowSchema),
	heatmap: zod.array(zod.array(Count)).length(7),
	mostActiveMembers: zod.array(
		zod.object({
			username: zod.string(),
			name: zod.string(),
			image: zod.string().nullable(),
			views: Count,
		}),
	),
});
export type AdminViewsOverview = z.infer<typeof AdminOverviewOutputSchema>;

export const AdminViewListInputSchema = zod.object({
	page: zod.number().int().min(1).default(1),
	pageSize: zod.number().int().min(10).max(100).default(25),
	resource: ViewResourceSchema.optional(),
	kind: ViewKindSchema.optional(),
	viewer: zod.enum(["all", "member", "guest"]).default("all"),
	source: ViewSourceSchema.optional(),
	/** Also show views the owner made of their own things. */
	includeOwn: zod.boolean().default(false),
});
export const AdminViewListOutputSchema = zod.object({
	items: zod.array(
		zod.object({
			id: zod.string(),
			at: zod.coerce.date(),
			resource: ViewResourceSchema,
			kind: ViewKindSchema,
			source: ViewSourceSchema,
			isOwner: zod.boolean(),
			viewer: zod
				.object({
					username: zod.string(),
					name: zod.string(),
					image: zod.string().nullable(),
				})
				.nullable(),
			/** Short, stable tag for a guest (the first characters of their id). */
			guestTag: zod.string(),
			item: zod.object({ title: zod.string(), href: zod.string() }).nullable(),
			device: zod.string().nullable(),
			browser: zod.string().nullable(),
			os: zod.string().nullable(),
			country: zod.string().nullable(),
			referrerHost: zod.string().nullable(),
		}),
	),
	total: Count,
	page: Count,
	pageSize: Count,
});
export type AdminViewList = z.infer<typeof AdminViewListOutputSchema>;
