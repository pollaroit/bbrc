"use client";

import type { AdminAuthorOverviewOutput } from "@bbrc/api/modules/author-admin/author-dashboard.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import { AuthorPhoto } from "@/components/blocks/author/author-photo";
import { Link } from "@/i18n/navigation";

type RankingItem = AdminAuthorOverviewOutput["rankings"]["byBooks"][number];

function RankingCard({
	title,
	items,
	metricLabel,
}: {
	title: string;
	items: RankingItem[];
	metricLabel: string;
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
							<li
								key={item.slug}
								className="flex items-center gap-2 border-border border-b py-2 last:border-0"
							>
								<AuthorPhoto
									size="sm"
									name={item.name}
									photoUrl={item.photoUrl}
								/>
								<div className="min-w-0 flex-1">
									<Link
										href={`/authors/${item.slug}` as Route}
										className="line-clamp-2 font-medium text-sm hover:underline"
									>
										{item.name}
									</Link>
									<p className="text-muted-foreground text-xs tabular-nums">
										{metricLabel}: {item.metric}
									</p>
								</div>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

export function AdminAuthorRankingLists({
	rankings,
}: {
	rankings: AdminAuthorOverviewOutput["rankings"];
}) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<RankingCard
				title="Most books"
				items={rankings.byBooks}
				metricLabel="Books"
			/>
			<RankingCard
				title="Most readers"
				items={rankings.byReaders}
				metricLabel="Readers"
			/>
			<RankingCard
				title="Most reads"
				items={rankings.byReads}
				metricLabel="Reads"
			/>
			<RankingCard
				title="Most followed"
				items={rankings.byFollowers}
				metricLabel="Followers"
			/>
		</div>
	);
}
