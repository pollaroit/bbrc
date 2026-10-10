import { DEFAULT_LEADERBOARD_PERIOD } from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { LeaderboardHub } from "@/components/blocks/leaderboard-hub";
import { LeaderboardPanel } from "@/components/blocks/leaderboard-panel";
import {
	loadFullLeaderboard,
	loadLeaderboardHubForIsr,
} from "@/lib/isr-data-leaderboard";
import {
	buildLeaderboardHubMetadata,
	buildLeaderboardKindMetadata,
	buildLeaderboardNotFoundMetadata,
} from "@/lib/leaderboard/page-metadata";
import {
	LEADERBOARD_OVERVIEW_SEGMENT,
	parseLeaderboardRouteSegment,
} from "@/lib/leaderboard/paths";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/leaderboard/[segment]">): Promise<Metadata> {
	const { segment } = await params;
	const routeSegment = parseLeaderboardRouteSegment(segment);

	if (routeSegment == null) {
		return buildLeaderboardNotFoundMetadata();
	}

	if (routeSegment === LEADERBOARD_OVERVIEW_SEGMENT) {
		return buildLeaderboardHubMetadata(DEFAULT_LEADERBOARD_PERIOD);
	}

	return buildLeaderboardKindMetadata(routeSegment, DEFAULT_LEADERBOARD_PERIOD);
}

export default async function LeaderboardSegmentPage({
	params,
}: PageProps<"/leaderboard/[segment]">) {
	const { segment } = await params;
	const routeSegment = parseLeaderboardRouteSegment(segment);

	if (routeSegment == null) {
		notFound();
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const viewerUsername = session?.user?.username;

	if (routeSegment === LEADERBOARD_OVERVIEW_SEGMENT) {
		const data = await loadLeaderboardHubForIsr(
			DEFAULT_LEADERBOARD_PERIOD,
			viewerUsername,
		);
		return <LeaderboardHub data={data} viewerUsername={viewerUsername} />;
	}

	const data = await loadFullLeaderboard(
		routeSegment,
		DEFAULT_LEADERBOARD_PERIOD,
		viewerUsername,
	);

	return <LeaderboardPanel data={data} viewerUsername={viewerUsername} />;
}
