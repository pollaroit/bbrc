import type { GetLeaderboardHubOutput } from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import type { Route } from "next";
import {
	LeaderboardPageHeader,
	LeaderboardStat,
} from "@/components/blocks/leaderboard-page-header";
import { LeaderboardStandings } from "@/components/blocks/leaderboard-standings";
import { Link } from "@/i18n/navigation";
import { leaderboardKindPath } from "@/lib/leaderboard/paths";

type LeaderboardHubProps = {
	data: GetLeaderboardHubOutput;
	viewerUsername?: string;
};

export function LeaderboardHub({ data, viewerUsername }: LeaderboardHubProps) {
	const isSignedIn = Boolean(viewerUsername);
	const totalBoards = data.categories.length;

	return (
		<div className="flex flex-col gap-8">
			<LeaderboardPageHeader
				title={`Leaderboard · ${data.periodLabel}`}
				description={
					isSignedIn
						? `Each board below shows five members around your rank for ${data.periodLabel.toLowerCase()}. Open a tab above for the complete standings.`
						: `Club-wide ${data.periodLabel.toLowerCase()} standings. Sign in to see where you sit on each board.`
				}
				stats={
					<>
						<LeaderboardStat label="Period" value={data.periodLabel} />
						<LeaderboardStat
							label="Your view"
							value={isSignedIn ? "5-row preview" : "Full lists only"}
						/>
						<LeaderboardStat label="Boards" value={totalBoards} />
					</>
				}
			/>

			<div className="flex flex-col gap-10">
				{data.categories.map((category) => (
					<section key={category.kind} className="flex flex-col gap-4">
						<div className="flex flex-wrap items-end justify-between gap-3 border-border border-b pb-3">
							<div className="flex min-w-0 flex-col gap-1">
								<h2 className="font-semibold text-lg tracking-tight">
									{category.title}
								</h2>
								<p className="max-w-prose text-muted-foreground text-sm leading-relaxed">
									{category.description}
								</p>
							</div>
							<Link
								href={leaderboardKindPath(category.kind, data.period) as Route}
								className="shrink-0 font-medium text-primary text-sm underline-offset-4 hover:underline"
							>
								Full list ({category.totalMembers})
							</Link>
						</div>

						{isSignedIn && category.items.length > 0 ? (
							<LeaderboardStandings
								items={category.items}
								metricLabel={category.metricLabel}
								totalMembers={category.totalMembers}
								viewerUsername={viewerUsername}
								previewLabel={`Preview: ${category.items.length} members near your rank (${category.totalMembers} total on this board).`}
							/>
						) : (
							<p className="text-muted-foreground text-sm">
								<Link
									href={
										leaderboardKindPath(category.kind, data.period) as Route
									}
									className="font-medium text-primary underline-offset-4 hover:underline"
								>
									Open the full {category.metricLabel.toLowerCase()} board
								</Link>
								{isSignedIn
									? " if you are not in the preview window yet."
									: " to browse every member."}
							</p>
						)}
					</section>
				))}
			</div>
		</div>
	);
}
