import { protectedProcedure } from "../../procedures";
import { cached } from "../../utils/cached";
import {
	ClubStatsClubLifeSchema,
	ClubStatsCommunitySchema,
	type ClubStatsInput,
	ClubStatsInputSchema,
	ClubStatsOverviewSchema,
	ClubStatsReadingSchema,
	ClubStatsTasteSchema,
} from "./club-stats.schema";
import {
	getClubStatsClubLife,
	getClubStatsCommunity,
	getClubStatsOverview,
	getClubStatsReading,
	getClubStatsTaste,
} from "./club-stats.service";
import { CLUB_STATS_TTL_SECONDS } from "./club-stats-core";

/** One cache entry per tab and period; a year with no year given means this year. */
export function clubStatsCacheKey(tab: string, input: ClubStatsInput): string {
	const year =
		input.periodType === "year"
			? input.period?.trim() || String(new Date().getUTCFullYear())
			: "";
	return `club-stats:v1:${tab}:${input.periodType}:${year}`;
}

/**
 * The whole club's numbers. Members only, and cached for an hour: the answer is the
 * same for everyone (counts and averages over every member, names only where a profile
 * is public), so one entry serves all.
 */
export const clubStatsRouter = {
	overview: protectedProcedure
		.input(ClubStatsInputSchema)
		.output(ClubStatsOverviewSchema)
		.handler(({ input, context }) =>
			cached(
				context.cache,
				clubStatsCacheKey("overview", input),
				CLUB_STATS_TTL_SECONDS,
				() => getClubStatsOverview(context.db, input),
			),
		),
	reading: protectedProcedure
		.input(ClubStatsInputSchema)
		.output(ClubStatsReadingSchema)
		.handler(({ input, context }) =>
			cached(
				context.cache,
				clubStatsCacheKey("reading", input),
				CLUB_STATS_TTL_SECONDS,
				() => getClubStatsReading(context.db, input),
			),
		),
	taste: protectedProcedure
		.input(ClubStatsInputSchema)
		.output(ClubStatsTasteSchema)
		.handler(({ input, context }) =>
			cached(
				context.cache,
				clubStatsCacheKey("taste", input),
				CLUB_STATS_TTL_SECONDS,
				() => getClubStatsTaste(context.db, input),
			),
		),
	community: protectedProcedure
		.input(ClubStatsInputSchema)
		.output(ClubStatsCommunitySchema)
		.handler(({ input, context }) =>
			cached(
				context.cache,
				clubStatsCacheKey("community", input),
				CLUB_STATS_TTL_SECONDS,
				() => getClubStatsCommunity(context.db, input),
			),
		),
	clubLife: protectedProcedure
		.input(ClubStatsInputSchema)
		.output(ClubStatsClubLifeSchema)
		.handler(({ input, context }) =>
			cached(
				context.cache,
				clubStatsCacheKey("club-life", input),
				CLUB_STATS_TTL_SECONDS,
				() => getClubStatsClubLife(context.db, input),
			),
		),
};
