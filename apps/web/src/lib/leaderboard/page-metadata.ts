import {
	LEADERBOARD_KIND_META,
	LEADERBOARD_PERIOD_META,
	type LeaderboardKind,
	type LeaderboardPeriod,
} from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import {
	leaderboardHubPath,
	leaderboardKindPath,
} from "@/lib/leaderboard/paths";
import { buildNotFoundMetadata, buildPageMetadata } from "@/lib/seo";

export function buildLeaderboardHubMetadata(
	period: LeaderboardPeriod = "month",
) {
	const periodLabel = LEADERBOARD_PERIOD_META[period].label;

	return buildPageMetadata({
		title: `Leaderboard overview · ${periodLabel}`,
		description: `Club-wide ${periodLabel.toLowerCase()} rankings for experience points, reading points, books marked read, feed posts, and sitting participations.`,
		path: leaderboardHubPath(period),
	});
}

export function buildLeaderboardKindMetadata(
	kind: LeaderboardKind,
	period: LeaderboardPeriod = "month",
) {
	const meta = LEADERBOARD_KIND_META[kind];
	const periodLabel = LEADERBOARD_PERIOD_META[period].label;

	return buildPageMetadata({
		title: `${meta.title} · ${periodLabel}`,
		description: `${meta.description} Rankings for the ${periodLabel.toLowerCase()} period.`,
		path: leaderboardKindPath(kind, period),
	});
}

export function buildLeaderboardNotFoundMetadata() {
	return buildNotFoundMetadata("Leaderboard");
}
