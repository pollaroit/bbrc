import type { GetLeaderboardOutput } from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import {
	LeaderboardPageHeader,
	LeaderboardStat,
} from "@/components/blocks/leaderboard-page-header";
import { LeaderboardStandings } from "@/components/blocks/leaderboard-standings";

type LeaderboardPanelProps = {
	data: GetLeaderboardOutput;
	viewerUsername?: string;
};

export function LeaderboardPanel({
	data,
	viewerUsername,
}: LeaderboardPanelProps) {
	const leader = data.items[0];
	const viewerLabel =
		data.viewer != null
			? `#${data.viewer.rank}`
			: viewerUsername
				? "Not ranked"
				: "Sign in";

	const countMismatch = data.items.length !== data.totalMembers;

	return (
		<section className="flex flex-col gap-6">
			{countMismatch ? (
				<p className="border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
					Standings could not load completely ({data.items.length} of{" "}
					{data.totalMembers} members). Refresh the page or report this if it
					persists.
				</p>
			) : null}
			<LeaderboardPageHeader
				title={`${data.title} · ${data.periodLabel}`}
				description={data.description}
				stats={
					<>
						<LeaderboardStat
							label="Members ranked"
							value={data.totalMembers.toLocaleString()}
						/>
						<LeaderboardStat label="Your rank" value={viewerLabel} />
						<LeaderboardStat
							label={`Top ${data.metricLabel.toLowerCase()}`}
							value={
								leader != null
									? `${leader.metric.toLocaleString()} (${leader.name})`
									: "-"
							}
						/>
					</>
				}
			/>

			<LeaderboardStandings
				items={data.items}
				metricLabel={data.metricLabel}
				totalMembers={data.totalMembers}
				viewerUsername={viewerUsername}
			/>
		</section>
	);
}
