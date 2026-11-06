"use client";

import type { MemberStatsClubLifeOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import type { Route } from "next";
import Link from "next/link";
import { HistogramChart } from "../stats-charts";
import {
	RankChip,
	RankedBars,
	StatRow,
	StatsEmpty,
	StatsSection,
} from "../stats-kit";

const n = (value: number) => value.toLocaleString("en-US");

export function ClubLifeTab({ data }: { data: MemberStatsClubLifeOutput }) {
	const { sittings, goals, achievements, standing } = data;
	const date = (value: Date | string) =>
		new Intl.DateTimeFormat("en-US", {
			month: "short",
			year: "numeric",
		}).format(new Date(value));

	return (
		<div className="flex flex-col gap-4">
			<StatsSection
				id="sittings"
				title="Sittings"
				description="Reading rounds with the club."
				actions={<RankChip rank={sittings.rank} what="sittings finished" />}
			>
				<StatRow
					items={[
						{ label: "Joined", value: n(sittings.joined) },
						{ label: "Finished", value: n(sittings.completed) },
						{ label: "In progress", value: n(sittings.inProgress) },
						{ label: "Did not finish", value: n(sittings.didNotFinish) },
						{ label: "Not started", value: n(sittings.notStarted) },
						{
							label: "Completion rate",
							value:
								sittings.completionRate != null
									? `${sittings.completionRate}%`
									: "—",
							hint: "of those that ended",
						},
						{
							label: "Organised",
							value: n(sittings.organised),
							hint: "sittings started",
						},
						{ label: "Votes cast", value: n(sittings.votesCast) },
						{ label: "Votes that won", value: n(sittings.votesThatWon) },
						{
							label: "Vote win rate",
							value:
								sittings.votesCast > 0
									? `${Math.round((sittings.votesThatWon / sittings.votesCast) * 100)}%`
									: "—",
							hint: "of votes cast",
						},
						{ label: "Books added", value: n(sittings.booksAdded) },
						{ label: "Books requested", value: n(sittings.booksRequested) },
					]}
				/>
				<HistogramChart
					points={sittings.progress}
					label="Sittings"
					className="h-44"
				/>
			</StatsSection>

			{goals ? (
				<StatsSection
					id="goals"
					title="Goals"
					description={`${goals.completed} of ${goals.total} goals completed.`}
				>
					{goals.active.length === 0 ? (
						<StatsEmpty>No goals running right now.</StatsEmpty>
					) : (
						<ul className="grid gap-3 md:grid-cols-2">
							{goals.active.map((goal) => (
								<li
									key={goal.slug}
									className="flex flex-col gap-1.5 border border-border bg-background p-3"
								>
									<div className="flex items-baseline justify-between gap-2">
										<span className="min-w-0 truncate font-medium text-sm">
											{goal.title}
										</span>
										<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
											{goal.current} of {goal.target} · {goal.year}
										</span>
									</div>
									<span className="block h-2 bg-muted" aria-hidden>
										<span
											className="block h-full bg-primary"
											style={{ width: `${goal.percent}%` }}
										/>
									</span>
								</li>
							))}
						</ul>
					)}
				</StatsSection>
			) : null}

			<StatsSection
				id="achievements"
				title="Achievements"
				description={`${achievements.earned} of ${achievements.total} earned.`}
				actions={
					<RankChip rank={achievements.rank} what="achievements earned" />
				}
			>
				<div className="grid gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							By category
						</h3>
						{achievements.byCategory.length === 0 ? (
							<StatsEmpty>None earned yet.</StatsEmpty>
						) : (
							<RankedBars
								rows={achievements.byCategory.map((row) => ({
									label: row.label,
									value: row.count,
								}))}
							/>
						)}
					</div>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Latest
							</h3>
							{achievements.recent.length === 0 ? (
								<StatsEmpty>Nothing yet.</StatsEmpty>
							) : (
								<ul className="flex flex-col gap-1">
									{achievements.recent.map((item) => (
										<li key={`${item.key}-${item.tier}`}>
											<Link
												href={`/achievements/${item.slug}` as Route}
												className="flex items-center justify-between gap-3 text-sm underline-offset-4 hover:underline"
											>
												<span className="truncate">
													{item.name}
													{item.tier > 1 ? ` · tier ${item.tier}` : ""}
												</span>
												<span className="shrink-0 text-muted-foreground text-xs">
													{date(item.earnedAt)}
												</span>
											</Link>
										</li>
									))}
								</ul>
							)}
						</div>
						{achievements.rarest.length > 0 ? (
							<div className="flex flex-col gap-2">
								<h3 className="font-medium text-muted-foreground text-xs">
									Rarest
								</h3>
								<ul className="flex flex-col gap-1">
									{achievements.rarest.map((item) => (
										<li
											key={item.slug}
											className="flex items-center justify-between gap-3 text-sm"
										>
											<Link
												href={`/achievements/${item.slug}` as Route}
												className="truncate underline-offset-4 hover:underline"
											>
												{item.name}
											</Link>
											<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
												{item.earnedBy} of {item.members} members
											</span>
										</li>
									))}
								</ul>
							</div>
						) : null}
					</div>
				</div>
			</StatsSection>

			<StatsSection
				id="standing"
				title="XP and rank"
				description="Points earned in the club, and where that puts them."
			>
				<StatRow
					items={[
						{ label: "XP", value: n(standing.xp), hint: standing.xpLevel },
						{ label: "RP", value: n(standing.rp), hint: standing.rpLevel },
					]}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<RankChip rank={standing.xpRank} what="XP" />
					<RankChip rank={standing.rpRank} what="RP" />
				</div>
			</StatsSection>
		</div>
	);
}
