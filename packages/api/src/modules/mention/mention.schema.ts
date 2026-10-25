import { z } from "zod";

/*
 * Mentions ("@Jon Doe") in posts, comments and reviews.
 *
 * - `mention.search`      the picker: 5 people, smart when nothing is typed.
 * - `mention.target`      the member a reply answers, by exact username (never cut off by the picker's limit).
 * - `mention.resolve`     current name/username/photo for mention ids (to show the CURRENT name).
 * - `mention.mine`        "Mentions" page: where I was mentioned.
 * - `mention.remove`      "Remove my mention": turns a mention of me into plain text.
 * - `mention.preferences` / `setPreferences`   "Allow others to mention me".
 */

export const MENTION_PICKER_LIMIT = 5;

export const MentionContextSchema = z
	.object({
		/** Writing on this post: its author and commenters come first. */
		postSlug: z.string().min(1).max(160).optional(),
		/** Writing on this review: its author and commenters come first. */
		feedbackSlug: z.string().min(1).max(160).optional(),
	})
	.optional();

export const MentionSearchInputSchema = z.object({
	query: z.string().trim().max(60).default(""),
	context: MentionContextSchema,
});

export const MentionCandidateSchema = z.object({
	id: z.string(),
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	/** Why they are in the list when nothing was typed. */
	reason: z.enum(["thread", "recent", "active", "match"]),
});
export type MentionCandidate = z.infer<typeof MentionCandidateSchema>;

export const MentionSearchOutputSchema = z.object({
	items: z.array(MentionCandidateSchema).max(MENTION_PICKER_LIMIT),
});

export const MentionTargetInputSchema = z.object({
	username: z.string().trim().min(1).max(60),
});
export const MentionTargetOutputSchema = z.object({
	member: z
		.object({ id: z.string(), username: z.string(), name: z.string() })
		.nullable(),
});

export const MentionResolveInputSchema = z.object({
	ids: z.array(z.string().uuid()).min(1).max(60),
});
export const MentionProfileSchema = z.object({
	id: z.string(),
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
});
export const MentionResolveOutputSchema = z.object({
	/** Only members that still exist and can be shown; others are left out (plain text then). */
	profiles: z.array(MentionProfileSchema),
});
export type MentionProfile = z.infer<typeof MentionProfileSchema>;

export const MentionKindSchema = z.enum(["post", "comment", "review"]);

export const MentionItemSchema = z.object({
	id: z.string(),
	createdAt: z.coerce.date(),
	kind: MentionKindSchema,
	author: z.object({
		username: z.string(),
		name: z.string(),
		image: z.string().nullable(),
	}),
	/** Plain-text preview of what was written (never raw JSON). */
	excerpt: z.string(),
	href: z.string(),
});
export const MentionMineInputSchema = z.object({
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(50).default(20),
});
export const MentionMineOutputSchema = z.object({
	items: z.array(MentionItemSchema),
	nextCursor: z.string().nullable(),
});
export type MentionItem = z.infer<typeof MentionItemSchema>;

export const MentionRemoveInputSchema = z.object({ id: z.string().uuid() });
export const OkSchema = z.object({ ok: z.literal(true) });

export const MentionPreferencesSchema = z.object({
	allowMentions: z.boolean(),
});
export const SetMentionPreferencesInputSchema = MentionPreferencesSchema;

// ── "Remove my mention" on the content itself ──────────────────────────────

const oneOf = (value: {
	postSlug?: string;
	commentSlug?: string;
	feedbackSlug?: string;
}) =>
	[value.postSlug, value.commentSlug, value.feedbackSlug].filter(Boolean)
		.length === 1;

/** The viewer's mention on one post, comment or review (exactly one slug). */
export const MentionForContentInputSchema = z
	.object({
		postSlug: z.string().min(1).max(160).optional(),
		commentSlug: z.string().min(1).max(160).optional(),
		feedbackSlug: z.string().min(1).max(160).optional(),
	})
	.refine(oneOf, {
		message: "Send exactly one of postSlug, commentSlug or feedbackSlug.",
	});
export const MentionForContentOutputSchema = z.object({
	mentionId: z.string().nullable(),
});

/** The same for a whole page of content in one call (at most 60 slugs in all). */
export const MentionForContentBatchInputSchema = z
	.object({
		postSlugs: z.array(z.string().min(1).max(160)).max(60).optional(),
		commentSlugs: z.array(z.string().min(1).max(160)).max(60).optional(),
		feedbackSlugs: z.array(z.string().min(1).max(160)).max(60).optional(),
	})
	.refine(
		(value) =>
			(value.postSlugs?.length ?? 0) +
				(value.commentSlugs?.length ?? 0) +
				(value.feedbackSlugs?.length ?? 0) <=
			60,
		{ message: "At most 60 slugs in all." },
	);
export const MentionForContentBatchOutputSchema = z.object({
	/** Only content that mentions the viewer; anything not listed has no mention of them. */
	items: z.array(
		z.object({
			kind: MentionKindSchema,
			slug: z.string(),
			mentionId: z.string(),
		}),
	),
});
