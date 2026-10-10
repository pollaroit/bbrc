import type {
	LeaderboardKind,
	LeaderboardPeriod,
} from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import {
	getLeaderboard,
	getLeaderboardHub,
} from "@bbrc/api/modules/leaderboard/leaderboard.service";
import { cache } from "react";
import { db } from "@/services";

/** Hub preview only. Never use for full standings pages. */
export const loadLeaderboardHubForIsr = cache(
	(period: LeaderboardPeriod, viewerUsername?: string) =>
		getLeaderboardHub({ period }, db, viewerUsername),
);

/** Full ranked list for one board and period. Not React-cached. */
export function loadFullLeaderboard(
	kind: LeaderboardKind,
	period: LeaderboardPeriod,
	viewerUsername?: string,
) {
	return getLeaderboard({ kind, period }, db, viewerUsername);
}
