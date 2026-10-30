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
	isLeaderboardPeriodSlug,
	LEADERBOARD_OVERVIEW_SEGMENT,
	parseLeaderboardRouteSegment,
	periodFromSlug,
} from "@/lib/leaderboard/paths";
import { getRequestViewer } from "@/lib/request-viewer";
import { auth } from "@/services";

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: PageProps<"/leaderboard/[segment]/[period]">): Promise<Metadata> {
	const { segment, period: periodParam } = await params;
	const routeSegment = parseLeaderboardRouteSegment(segment);

	if (routeSegment == null || !isLeaderboardPeriodSlug(periodParam)) {
		return buildLeaderboardNotFoundMetadata();
	}

	const period = periodFromSlug(periodParam);

	if (routeSegment === LEADERBOARD_OVERVIEW_SEGMENT) {
		return buildLeaderboardHubMetadata(period);
	}

	return buildLeaderboardKindMetadata(routeSegment, period);
}

export default async function LeaderboardSegmentPeriodPage({
	params,
}: PageProps<"/leaderboard/[segment]/[period]">) {
	const { segment, period: periodParam } = await params;

	const routeSegment = parseLeaderboardRouteSegment(segment);
	if (routeSegment == null || !isLeaderboardPeriodSlug(periodParam)) {
		notFound();
	}

	const period = periodFromSlug(periodParam);

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const viewerUsername = session?.user?.username;
	const viewer = await getRequestViewer();

	if (routeSegment === LEADERBOARD_OVERVIEW_SEGMENT) {
		const data = await loadLeaderboardHubForIsr(period, viewer);
		return <LeaderboardHub data={data} viewerUsername={viewerUsername} />;
	}

	const data = await loadFullLeaderboard(routeSegment, period, viewer);

	return <LeaderboardPanel data={data} viewerUsername={viewerUsername} />;
}
