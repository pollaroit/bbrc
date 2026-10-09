"use client";

import type { AdminFeedbackOverviewOutput } from "@bbrc/api/modules/admin/admin-feedback.schema";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";

type FeedbackRankingItem =
	AdminFeedbackOverviewOutput["rankings"]["highestRated"][number];

function FeedbackRankingRow({
	item,
	metricLabel,
	secondaryLabel,
}: {
	item: FeedbackRankingItem;
	metricLabel: string;
	secondaryLabel?: string;
}) {
	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="min-w-0 flex-1">
				<p className="line-clamp-2 font-medium text-sm">{item.bookTitle}</p>
				<p className="text-muted-foreground text-xs">
					<Link
						href={`/users/${item.authorUsername}` as Route}
						className="hover:underline"
					>
						@{item.authorUsername}
					</Link>
					{" · "}
					<Link
						href={
							`/admin/feedbacks/list?search=${encodeURIComponent(item.slug)}` as Route
						}
						className="font-mono hover:underline"
					>
						{item.slug}
					</Link>
				</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					{metricLabel}: {item.metric}
					{item.secondaryMetric != null && secondaryLabel
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
					{" · Rating: "}
					{item.rating.toFixed(1)}
				</p>
			</div>
			<Badge variant="secondary">{item.rating.toFixed(1)}</Badge>
		</li>
	);
}

function FeedbackRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
}: {
	title: string;
	items: FeedbackRankingItem[];
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
							<FeedbackRankingRow
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

type AdminFeedbackRankingListsProps = {
	rankings: AdminFeedbackOverviewOutput["rankings"];
};

export function AdminFeedbackRankingLists({
	rankings,
}: AdminFeedbackRankingListsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<FeedbackRankingCard
				title="Highest rated"
				items={rankings.highestRated}
				metricLabel="Rating"
			/>
			<FeedbackRankingCard
				title="Lowest rated"
				items={rankings.lowestRated}
				metricLabel="Rating"
			/>
			<FeedbackRankingCard
				title="Most liked"
				items={rankings.mostLiked}
				metricLabel="Likes"
			/>
			<FeedbackRankingCard
				title="Most commented"
				items={rankings.mostCommented}
				metricLabel="Comments"
			/>
			<FeedbackRankingCard
				title="Longest reviews"
				items={rankings.longestReviews}
				metricLabel="Characters"
			/>
			<FeedbackRankingCard
				title="Shortest reviews"
				items={rankings.shortestReviews}
				metricLabel="Characters"
			/>
			<FeedbackRankingCard
				title="Most post attachments"
				items={rankings.mostPostAttachments}
				metricLabel="Attachments"
			/>
			<FeedbackRankingCard
				title="Highest engagement"
				items={rankings.highestEngagement}
				metricLabel="Likes + comments"
				secondaryLabel="Likes"
			/>
			<FeedbackRankingCard
				title="On longest books"
				items={rankings.onLongestBooks}
				metricLabel="Pages"
			/>
		</div>
	);
}
