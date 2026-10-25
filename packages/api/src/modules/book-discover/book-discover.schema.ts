import { z } from "zod";

export const DISCOVER_LANE_IDS = [
	"for_you",
	"series_next",
	"rated_authors",
	"gaps",
	"member_wants",
	"ai",
] as const;
export const DiscoverLaneIdSchema = z.enum(DISCOVER_LANE_IDS);
export type DiscoverLaneId = z.infer<typeof DiscoverLaneIdSchema>;

export const DiscoverItemSchema = z.object({
	olid: z.string(),
	title: z.string(),
	authors: z.array(z.string()),
	coverId: z.number().int().nullable(),
	publishedIn: z.number().int().nullable(),
	/** Why this book is suggested, in a sentence. */
	reason: z.string(),
	/** Set on "members want this": the request behind it. */
	request: z
		.object({
			id: z.string(),
			upvoteCount: z.number().int(),
			requester: z.string(),
		})
		.nullable(),
});
export type DiscoverItem = z.infer<typeof DiscoverItemSchema>;

export const DiscoverLaneSchema = z.object({
	id: DiscoverLaneIdSchema,
	title: z.string(),
	description: z.string(),
	items: z.array(DiscoverItemSchema),
	/** Why the lane has nothing (not configured, nothing to base it on…). */
	empty: z.string().nullable(),
	/** AI lane only: asks left today for a member (null for admins or other lanes). */
	asksLeft: z.number().int().nullable(),
	generatedAt: z.coerce.date(),
});
export type DiscoverLane = z.infer<typeof DiscoverLaneSchema>;

export const DiscoverLaneInfoSchema = z.object({
	id: DiscoverLaneIdSchema,
	title: z.string(),
	description: z.string(),
	/** Runs only when asked (the AI lane). */
	onDemand: z.boolean(),
});

export const ListDiscoverLanesOutputSchema = z.object({
	lanes: z.array(DiscoverLaneInfoSchema),
});

export const GetDiscoverLaneInputSchema = z.object({
	id: DiscoverLaneIdSchema,
	/** AI lane: ignore the cached answer and ask again (counts against a member's daily limit). */
	refresh: z.boolean().optional(),
});

export const AI_ASKS_PER_MEMBER_PER_DAY = 3;
