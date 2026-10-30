import type {
	LeaderboardKind,
	LeaderboardPeriod,
} from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import {
	getLeaderboard,
	getLeaderboardHub,
} from "@bbrc/api/modules/leaderboard/leaderboard.service";
import type { Viewer } from "@bbrc/shared";
import { cache } from "react";
import { db } from "@/services";

/** Hub preview only. Never use for full standings pages. */
export const loadLeaderboardHubForIsr = cache(
	(period: LeaderboardPeriod, viewer: Viewer) =>
		getLeaderboardHub({ period }, db, viewer),
);

/** Full ranked list for one board and period. Not React-cached. */
export function loadFullLeaderboard(
	kind: LeaderboardKind,
	period: LeaderboardPeriod,
	viewer: Viewer,
) {
	return getLeaderboard({ kind, period }, db, viewer);
}
