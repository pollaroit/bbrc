"use client";

import type { AdminSittingOverviewOutput } from "@bbrc/api/modules/admin/admin-sitting.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import { SittingStatusBadge } from "@/components/blocks/sitting-status-badge";
import { Link } from "@/i18n/navigation";
import { sittingStatusFilterLabels } from "@/lib/listing/sittings-listing";

type SittingRankingItem =
	AdminSittingOverviewOutput["rankings"]["mostParticipants"][number];

function formatMetricValue(item: SittingRankingItem, metricLabel: string) {
	if (item.label === "deadline" && item.metric > 1_000_000_000_000) {
		const date = new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(item.metric));
		return `${metricLabel}: ${date}`;
	}

	if (item.label === "% completed") {
		return `${metricLabel}: ${item.metric}% (${item.secondaryMetric ?? 0} finished)`;
	}

	if (item.label) {
		return `${metricLabel}: ${item.metric} ${item.label}`;
	}

	return `${metricLabel}: ${item.metric}`;
}

function SittingRankingRow({
	item,
	metricLabel,
	secondaryLabel,
}: {
	item: SittingRankingItem;
	metricLabel: string;
	secondaryLabel?: string;
}) {
	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href={`/sittings/${item.slug}` as Route}
						className="font-medium font-mono text-sm hover:underline"
					>
						{item.slug}
					</Link>
					<SittingStatusBadge status={item.status} />
				</div>
				<p className="text-muted-foreground text-xs tabular-nums">
					{formatMetricValue(item, metricLabel)}
					{item.secondaryMetric != null &&
					secondaryLabel &&
					item.label !== "% completed"
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
				</p>
			</div>
		</li>
	);
}

function SittingRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
}: {
	title: string;
	items: SittingRankingItem[];
	metricLabel: string;
	secondaryLabel?: string;
}) {
	return (
		<Card size="sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-xs">No data yet.</p>
				) : (
					<ul>
						{items.map((item) => (
							<SittingRankingRow
								key={`${title}-${item.slug}`}
								item={item}
								metricLabel={metricLabel}
								secondaryLabel={secondaryLabel}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type AdminSittingRankingListsProps = {
	rankings: AdminSittingOverviewOutput["rankings"];
};

export function AdminSittingRankingLists({
	rankings,
}: AdminSittingRankingListsProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<SittingRankingCard
					title="Most participants"
					items={rankings.mostParticipants}
					metricLabel="Participants"
				/>
				<SittingRankingCard
					title="Least participants"
					items={rankings.leastParticipants}
					metricLabel="Participants"
				/>
				<SittingRankingCard
					title="Most poll votes"
					items={rankings.mostPollVotes}
					metricLabel="Votes"
				/>
				<SittingRankingCard
					title="Most distinct voters"
					items={rankings.mostDistinctVoters}
					metricLabel="Voters"
				/>
				<SittingRankingCard
					title="Most completed readers"
					items={rankings.mostCompletedReaders}
					metricLabel="Completed"
				/>
				<SittingRankingCard
					title="Most DNF"
					items={rankings.mostDnfParticipants}
					metricLabel="DNF"
				/>
				<SittingRankingCard
					title="Most post attachments"
					items={rankings.mostPostAttachments}
					metricLabel="Attachments"
				/>
				<SittingRankingCard
					title="Longest reading phase"
					items={rankings.longestReadingPhase}
					metricLabel="Duration"
				/>
				<SittingRankingCard
					title="Highest completion rate"
					items={rankings.highestCompletionRate}
					metricLabel="Completion"
				/>
				<SittingRankingCard
					title="Soonest voting deadlines"
					items={rankings.soonestVotingDeadlines}
					metricLabel="Closes"
				/>
			</div>
			<Card size="sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Status legend</CardTitle>
				</CardHeader>
				<CardContent>
					<ul className="flex flex-wrap gap-3">
						{(["voting", "reading", "finished"] as const).map((status) => (
							<li key={status} className="flex items-center gap-2">
								<SittingStatusBadge status={status} />
								<span className="text-muted-foreground text-xs">
									{sittingStatusFilterLabels[status]}
								</span>
							</li>
						))}
					</ul>
				</CardContent>
			</Card>
		</div>
	);
}
