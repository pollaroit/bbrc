import { z } from "zod";
import { leaderboardPeriods } from "./leaderboard-period";

export {
	DEFAULT_LEADERBOARD_PERIOD,
	LEADERBOARD_PERIOD_META,
	type LeaderboardPeriod,
	type LeaderboardPeriodSlug,
	type LeaderboardReadsPeriod,
	leaderboardPeriodSlugs,
	leaderboardPeriods,
	leaderboardPeriodsForKind,
	leaderboardReadsPeriods,
	normalizeLeaderboardPeriodForKind,
	periodFromSlug,
	slugFromPeriod,
} from "./leaderboard-period";

export const LeaderboardPeriodSchema = z.enum(leaderboardPeriods);

export const leaderboardKinds = [
	"xp",
	"rp",
	"reads",
	"posts",
	"participations",
] as const;

export type LeaderboardKind = (typeof leaderboardKinds)[number];

export const LeaderboardKindSchema = z.enum(leaderboardKinds);

export const LeaderboardEntrySchema = z.object({
	rank: z.number().int().positive(),
	username: z.string(),
	name: z.string(),
	image: z.string().nullable(),
	isAdmin: z.boolean(),
	metric: z.number().int(),
});

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

export const LeaderboardViewerSchema = z.object({
	rank: z.number().int().positive(),
	metric: z.number().int(),
});

export const GetLeaderboardInputSchema = z.object({
	kind: LeaderboardKindSchema,
	period: LeaderboardPeriodSchema.default("month"),
});

export const GetLeaderboardHubInputSchema = z.object({
	period: LeaderboardPeriodSchema.default("month"),
});

export const GetLeaderboardOutputSchema = z.object({
	kind: LeaderboardKindSchema,
	period: LeaderboardPeriodSchema,
	periodLabel: z.string(),
	title: z.string(),
	description: z.string(),
	metricLabel: z.string(),
	totalMembers: z.number().int().nonnegative(),
	items: z.array(LeaderboardEntrySchema),
	viewer: LeaderboardViewerSchema.nullable(),
});

export type GetLeaderboardInput = z.infer<typeof GetLeaderboardInputSchema>;
export type GetLeaderboardHubInput = z.infer<
	typeof GetLeaderboardHubInputSchema
>;
export type GetLeaderboardOutput = z.infer<typeof GetLeaderboardOutputSchema>;

export const GetLeaderboardHubOutputSchema = z.object({
	period: LeaderboardPeriodSchema,
	periodLabel: z.string(),
	categories: z.array(
		z.object({
			kind: LeaderboardKindSchema,
			title: z.string(),
			description: z.string(),
			metricLabel: z.string(),
			totalMembers: z.number().int().nonnegative(),
			items: z.array(LeaderboardEntrySchema),
			viewer: LeaderboardViewerSchema.nullable(),
		}),
	),
});

export type GetLeaderboardHubOutput = z.infer<
	typeof GetLeaderboardHubOutputSchema
>;

export const LEADERBOARD_KIND_META: Record<
	LeaderboardKind,
	{ title: string; description: string; metricLabel: string }
> = {
	xp: {
		title: "Experience points",
		description:
			"Club activity and milestones stack up as XP. Tied scores share the same place.",
		metricLabel: "XP",
	},
	rp: {
		title: "Reading points",
		description:
			"RP reflects reading-round performance. Members with the same total share a rank.",
		metricLabel: "RP",
	},
	reads: {
		title: "Books marked read",
		description:
			"Personal read records on catalog books — inside sittings or on your own timeline.",
		metricLabel: "Reads",
	},
	posts: {
		title: "Feed posts",
		description:
			"Original posts published to the club feed, ranked by total count.",
		metricLabel: "Posts",
	},
	participations: {
		title: "Sitting participations",
		description:
			"Times members joined a reading round, including active and finished sittings.",
		metricLabel: "Participations",
	},
};
