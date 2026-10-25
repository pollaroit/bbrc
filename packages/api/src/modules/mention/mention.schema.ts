import { z } from "zod";

/*
 * Mentions ("@Jon Doe") in posts, comments and reviews.
 *
 * - `mention.search`      the picker: 5 people, smart when nothing is typed.
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
