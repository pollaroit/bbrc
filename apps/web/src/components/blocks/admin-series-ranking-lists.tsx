"use client";

import type { AdminSeriesOverviewOutput } from "@bbrc/api/modules/admin/admin-series.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";

type SeriesRankingItem =
	AdminSeriesOverviewOutput["rankings"]["mostBooks"][number];

function SeriesRankingRow({
	item,
	metricLabel,
	formatAsDate,
}: {
	item: SeriesRankingItem;
	metricLabel: string;
	formatAsDate?: boolean;
}) {
	const metricDisplay =
		formatAsDate && item.metric > 1_000_000_000_000
			? new Intl.DateTimeFormat(undefined, {
					year: "numeric",
					month: "short",
					day: "numeric",
				}).format(new Date(item.metric))
			: item.metric;

	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="min-w-0 flex-1">
				<Link
					href={`/admin/series/${item.slug}` as Route}
					className="line-clamp-2 font-medium text-sm hover:underline"
				>
					{item.title}
				</Link>
				<p className="text-muted-foreground text-xs">
					<span className="font-mono">{item.slug}</span>
					{" · "}
					{item.bookCount} {item.bookCount === 1 ? "book" : "books"}
				</p>
			</div>
			<p className="shrink-0 text-muted-foreground text-xs tabular-nums">
				{metricLabel}: {metricDisplay}
			</p>
		</li>
	);
}

function RankingCard({
	title,
	items,
	metricLabel,
	formatAsDate,
}: {
	title: string;
	items: SeriesRankingItem[];
	metricLabel: string;
	formatAsDate?: boolean;
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-sm">Nothing to show yet.</p>
				) : (
					<ul>
						{items.map((item) => (
							<SeriesRankingRow
								key={item.slug}
								item={item}
								metricLabel={metricLabel}
								formatAsDate={formatAsDate}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

export function AdminSeriesRankingLists({
	rankings,
}: {
	rankings: AdminSeriesOverviewOutput["rankings"];
}) {
	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<RankingCard
				title="Most books"
				items={rankings.mostBooks}
				metricLabel="Books"
			/>
			<RankingCard
				title="Recently updated"
				items={rankings.recentlyUpdated}
				metricLabel="Updated"
				formatAsDate
			/>
			<RankingCard
				title="Empty series"
				items={rankings.emptySeries}
				metricLabel="Books"
			/>
		</div>
	);
}
