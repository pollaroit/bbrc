"use client";

import type { AdminBookOverviewOutput } from "@bbrc/api/modules/admin/admin-book.schema";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { bookCoverUrl } from "@/lib/book-cover";

type BookRankingItem =
	AdminBookOverviewOutput["rankings"]["mostFavorited"][number];

function BookRankingRow({
	item,
	metricLabel,
	secondaryLabel,
}: {
	item: BookRankingItem;
	metricLabel: string;
	secondaryLabel?: string;
}) {
	const cover = bookCoverUrl(item.coverId, "S");

	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="relative aspect-2/3 w-8 shrink-0 overflow-hidden bg-muted ring-1 ring-foreground/10">
				{cover ? (
					<Image
						src={cover}
						alt=""
						fill
						className="object-cover"
						sizes="32px"
					/>
				) : null}
			</div>
			<div className="min-w-0 flex-1">
				<Link
					href={`/books/${item.slug}` as Route}
					className="line-clamp-2 font-medium text-sm hover:underline"
				>
					{item.title}
				</Link>
				<p className="text-muted-foreground text-xs tabular-nums">
					{metricLabel}: {item.metric}
					{item.secondaryMetric != null && secondaryLabel
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
				</p>
			</div>
		</li>
	);
}

function BookRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
}: {
	title: string;
	items: BookRankingItem[];
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
							<BookRankingRow
								key={item.slug}
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

type AdminBookRankingListsProps = {
	rankings: AdminBookOverviewOutput["rankings"];
};

export function AdminBookRankingLists({
	rankings,
}: AdminBookRankingListsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<BookRankingCard
				title="Most favorited"
				items={rankings.mostFavorited}
				metricLabel="Favorites"
			/>
			<BookRankingCard
				title="Longest"
				items={rankings.longest}
				metricLabel="Pages"
			/>
			<BookRankingCard
				title="Shortest"
				items={rankings.shortest}
				metricLabel="Pages"
			/>
			<BookRankingCard
				title="Earliest published"
				items={rankings.earliestPublished}
				metricLabel="Year"
			/>
			<BookRankingCard
				title="Newest published"
				items={rankings.newestPublished}
				metricLabel="Year"
			/>
			<Card size="sm">
				<CardHeader className="pb-2">
					<CardTitle className="text-sm">Authors by catalog size</CardTitle>
				</CardHeader>
				<CardContent>
					{rankings.authorsByCatalogSize.length === 0 ? (
						<p className="text-muted-foreground text-xs">No data yet.</p>
					) : (
						<ul>
							{rankings.authorsByCatalogSize.map((author) => (
								<li
									key={author.authorSlug}
									className="flex flex-wrap items-center justify-between gap-2 border-border border-b py-2 last:border-0"
								>
									<span className="font-medium text-sm">
										{author.authorName}
									</span>
									<div className="flex items-center gap-2">
										<Badge variant="secondary">{author.bookCount} books</Badge>
										<Link
											href={
												`/books?authors=${encodeURIComponent(author.authorSlug)}` as Route
											}
											className="text-foreground text-xs underline"
										>
											View books
										</Link>
									</div>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
			<BookRankingCard
				title="Open Library rating"
				items={rankings.openLibraryRating}
				metricLabel="OL"
			/>
			<BookRankingCard
				title="Club average rating"
				items={rankings.clubAverageRating}
				metricLabel="Club"
			/>
			<BookRankingCard
				title="Most shelved"
				items={rankings.mostShelved}
				metricLabel="Shelves"
			/>
			<BookRankingCard
				title="Most poll votes"
				items={rankings.mostPollVotes}
				metricLabel="Votes"
				secondaryLabel="Avg voters / poll"
			/>
			<BookRankingCard
				title="Most feedbacks"
				items={rankings.mostFeedbacks}
				metricLabel="Feedbacks"
			/>
			<BookRankingCard
				title="Most post attachments"
				items={rankings.mostPostAttachments}
				metricLabel="Attachments"
			/>
		</div>
	);
}
