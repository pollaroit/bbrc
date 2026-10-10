import type { LeaderboardEntry } from "@bbrc/api/modules/leaderboard/leaderboard.schema";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@bbrc/ui/components/table";
import type { Route } from "next";
import Link from "next/link";
import { UserPanel } from "@/components/blocks/user-panel";
import { cn } from "@/lib/utils";

type LeaderboardStandingsProps = {
	items: LeaderboardEntry[];
	metricLabel: string;
	totalMembers: number;
	viewerUsername?: string;
	/** Hub preview only. Full pages must omit this. */
	previewLabel?: string;
};

function formatMetric(value: number, label: string): string {
	if (label === "XP" || label === "RP") {
		return value.toLocaleString();
	}
	return String(value);
}

export function LeaderboardStandings({
	items,
	metricLabel,
	totalMembers,
	viewerUsername,
	previewLabel,
}: LeaderboardStandingsProps) {
	const isPreview = previewLabel != null;
	const showingCount = items.length;

	if (showingCount === 0) {
		return (
			<p className="border border-border bg-muted/10 px-4 py-8 text-center text-muted-foreground text-sm">
				No members on this board yet.
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{isPreview ? (
				<p className="text-muted-foreground text-xs">{previewLabel}</p>
			) : (
				<p className="text-muted-foreground text-xs tabular-nums">
					Showing all {showingCount} of {totalMembers}{" "}
					{totalMembers === 1 ? "member" : "members"}. Tied scores share the
					same rank.
				</p>
			)}

			<div className="border border-border bg-card">
				<Table>
					<TableHeader>
						<TableRow className="hover:bg-transparent">
							<TableHead className="w-14 text-right">Rank</TableHead>
							<TableHead>Member</TableHead>
							<TableHead className="w-28 text-right">{metricLabel}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map((entry) => {
							const isViewer = entry.username === viewerUsername;
							const isTop = entry.rank <= 3;

							return (
								<TableRow
									key={entry.username}
									id={isViewer ? "leaderboard-you" : undefined}
									className={cn(
										isViewer && "bg-primary/10 hover:bg-primary/15",
										!isViewer && isTop && "bg-muted/25",
									)}
								>
									<TableCell className="text-right font-medium tabular-nums">
										{entry.rank}
									</TableCell>
									<TableCell>
										<Link
											href={`/users/${entry.username}` as Route}
											className="inline-flex min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
										>
											<UserPanel
												user={{
													name: entry.name,
													username: entry.username,
													image: entry.image,
													isAdmin: entry.isAdmin,
												}}
												renderDescription={`@${entry.username}`}
												imageClassName="size-9"
											/>
										</Link>
									</TableCell>
									<TableCell className="text-right font-medium tabular-nums">
										{formatMetric(entry.metric, metricLabel)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{!isPreview &&
			viewerUsername &&
			items.some((e) => e.username === viewerUsername) ? (
				<p className="text-muted-foreground text-xs">
					Your row is highlighted.{" "}
					<a
						href="#leaderboard-you"
						className="text-primary underline-offset-4 hover:underline"
					>
						Jump to your rank
					</a>
				</p>
			) : null}
		</div>
	);
}
