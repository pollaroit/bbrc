import zod from "zod";

const CountSchema = zod.number().int().min(0);

export const AchievementTierSchema = zod.object({
	tier: zod.number().int().min(1),
	/** Empty for achievements with a single tier. */
	name: zod.string(),
	threshold: zod.number(),
	description: zod.string(),
	/** Visible members who earned this tier (any period). */
	earnedBy: CountSchema,
});

export const AchievementViewerSchema = zod.object({
	/** Highest tier the viewer has earned (0 when none). */
	tier: CountSchema,
	/** Progress this year for yearly achievements, otherwise all-time. */
	value: zod.number(),
	next: zod.number().nullable(),
	/** The tier `next` belongs to; for yearly achievements this is about the current year. */
	nextTier: zod.number().int().nullable(),
	earnedAtByTier: zod.record(zod.string(), zod.string()),
});

export const AchievementSummarySchema = zod.object({
	key: zod.string(),
	slug: zod.string(),
	name: zod.string(),
	category: zod.string(),
	icon: zod.string(),
	isHidden: zod.boolean(),
	isYearly: zod.boolean(),
	tiers: zod.array(AchievementTierSchema),
	viewer: AchievementViewerSchema.nullable(),
});

export const ListAchievementsOutputSchema = zod.object({
	memberCount: CountSchema,
	/** Hidden achievements the viewer has not found yet. */
	hiddenRemaining: CountSchema,
	items: zod.array(AchievementSummarySchema),
});

export const GetAchievementInputSchema = zod.object({
	slug: zod.string().min(1),
});

export const AchievementEarnerSchema = zod.object({
	username: zod.string(),
	name: zod.string(),
	image: zod.string().nullable(),
	tier: zod.number().int(),
	periodKey: zod.string(),
	earnedAt: zod.string(),
});

export const ListEarnersInputSchema = zod.object({
	slug: zod.string().min(1),
	/** Only members whose highest tier is this one. */
	tier: zod.number().int().min(1).optional(),
	offset: zod.number().int().min(0).default(0),
	limit: zod.number().int().min(1).max(100).default(30),
});

export const ListEarnersOutputSchema = zod.object({
	/** Every earner, private ones included. */
	total: CountSchema,
	/** Earners whose names are not shown to this viewer (they are counted in `total`). */
	privateCount: CountSchema,
	/** Members per highest tier, regardless of the tier filter. */
	perTier: zod.record(zod.string(), CountSchema),
	items: zod.array(AchievementEarnerSchema),
});

export type ListEarnersOutput = zod.infer<typeof ListEarnersOutputSchema>;

export const GetAchievementOutputSchema = AchievementSummarySchema.extend({
	memberCount: CountSchema,
	description: zod.string(),
	recentEarners: zod.array(AchievementEarnerSchema),
});

export const GetUserAchievementsInputSchema = zod.object({
	username: zod.string().min(1),
});

export const UserAwardSchema = zod.object({
	id: zod.string(),
	key: zod.string(),
	tier: zod.number().int(),
	periodKey: zod.string(),
	earnedAt: zod.string(),
	pinOrder: zod.number().int().nullable(),
});

export const GetUserAchievementsOutputSchema = zod.object({
	username: zod.string(),
	isOwner: zod.boolean(),
	totalAchievements: CountSchema,
	earnedCount: CountSchema,
	hiddenRemaining: CountSchema,
	awards: zod.array(UserAwardSchema),
	/** Only for the owner: the next step on achievements they have started. */
	progress: zod.array(
		zod.object({
			key: zod.string(),
			periodKey: zod.string(),
			value: zod.number(),
			tier: CountSchema,
			next: zod.number().nullable(),
		}),
	),
});

export const SetShowcaseInputSchema = zod.object({
	awardIds: zod.array(zod.string()).max(4),
});

export const RevokeAchievementInputSchema = zod.object({
	awardId: zod.string(),
	reason: zod.string().trim().max(200).optional(),
});

export const OkOutputSchema = zod.object({ ok: zod.literal(true) });

export type ListAchievementsOutput = zod.infer<
	typeof ListAchievementsOutputSchema
>;
export type AchievementSummary = zod.infer<typeof AchievementSummarySchema>;
export type GetAchievementOutput = zod.infer<typeof GetAchievementOutputSchema>;
export type GetUserAchievementsOutput = zod.infer<
	typeof GetUserAchievementsOutputSchema
>;
export type UserAward = zod.infer<typeof UserAwardSchema>;
