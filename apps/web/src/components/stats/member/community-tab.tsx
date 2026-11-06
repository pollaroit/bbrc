"use client";

import type { MemberStatsCommunityOutput } from "@bbrc/api/modules/member-stats/member-stats.schema";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@bbrc/ui/components/chart";
import type { Route } from "next";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	ShelfCatalogCard,
	shelvesGridClassName,
} from "@/components/blocks/shelf-catalog-card";
import { CoverLink } from "../cover-link";
import { CumulativeArea } from "../cumulative-area";
import { HistogramChart } from "../stats-charts";
import { RankChip, StatRow, StatsEmpty, StatsSection } from "../stats-kit";

const n = (value: number) => value.toLocaleString("en-US");

export function CommunityTab({ data }: { data: MemberStatsCommunityOutput }) {
	const { reviews, posts, shelves, friends } = data;

	return (
		<div className="flex flex-col gap-4">
			{reviews ? (
				<StatsSection
					id="reviews"
					title="Reviews"
					description="Ratings and reviews written, and how they landed."
					actions={<RankChip rank={reviews.rank} what="reviews written" />}
				>
					<StatRow
						items={[
							{ label: "Reviews", value: n(reviews.count) },
							{
								label: "Average rating",
								value:
									reviews.average != null
										? `${reviews.average.toFixed(1)}★`
										: "—",
							},
							{ label: "Likes received", value: n(reviews.likes) },
							{ label: "Comments received", value: n(reviews.comments) },
						]}
					/>
					<div className="grid gap-4 lg:grid-cols-2">
						<div className="flex flex-col gap-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Reviews over time
							</h3>
							<CumulativeArea points={reviews.cumulative} label="Reviews" />
						</div>
						<div className="flex flex-col gap-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Ratings given
							</h3>
							<HistogramChart
								points={reviews.spread}
								label="Ratings"
								className="h-52"
							/>
						</div>
					</div>
					{reviews.top.length > 0 ? (
						<div className="flex flex-col gap-2">
							<h3 className="font-medium text-muted-foreground text-xs">
								Most engaged reviews
							</h3>
							<ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
								{reviews.top.map((row) => (
									<li key={row.slug}>
										<CoverLink
											book={row.book}
											href={`/books/${row.book.slug}/feedbacks/${row.slug}`}
											caption={`${row.likes} likes · ${row.comments} comments`}
											detail={`${row.rating}★ · open the review`}
										/>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</StatsSection>
			) : null}

			<StatsSection
				id="posts"
				title="Posts"
				description="What was shared with the club."
				actions={<RankChip rank={posts.rank} what="posts" />}
			>
				<StatRow
					items={[
						{ label: "Posts", value: n(posts.count) },
						{ label: "Likes received", value: n(posts.likes) },
						{ label: "Comments received", value: n(posts.comments) },
						{ label: "Polls", value: n(posts.polls) },
						{ label: "Tierlists", value: n(posts.tierlists) },
					]}
				/>
				<div className="grid gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Posts over time
						</h3>
						<CumulativeArea points={posts.cumulative} label="Posts" />
					</div>
					<div className="flex flex-col gap-2">
						<h3 className="font-medium text-muted-foreground text-xs">
							Most engaged posts
						</h3>
						{posts.top.length === 0 ? (
							<StatsEmpty>No post has had a like or a comment yet.</StatsEmpty>
						) : (
							<ol className="flex flex-col gap-1.5">
								{posts.top.map((post) => (
									<li key={post.slug}>
										<Link
											href={`/posts/${post.slug}` as Route}
											className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
										>
											<span className="min-w-0 truncate">
												{post.preview || "A post"}
											</span>
											<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
												{post.likes} ♥ · {post.comments} 💬
											</span>
										</Link>
									</li>
								))}
							</ol>
						)}
					</div>
				</div>
			</StatsSection>

			<StatsSection
				id="shelves"
				title="Shelves"
				description="The shelves they made and what is on them."
				actions={<RankChip rank={shelves.rank} what="shelves made" />}
			>
				<StatRow
					items={[
						{ label: "Shelves", value: n(shelves.count) },
						{ label: "Books on shelves", value: n(shelves.books) },
					]}
				/>
				{shelves.top.length === 0 ? (
					<StatsEmpty>No public shelves in this period.</StatsEmpty>
				) : (
					<ul className={shelvesGridClassName}>
						{shelves.top.map((shelf) => (
							<li key={`${shelf.owner.username}/${shelf.slug}`}>
								<ShelfCatalogCard shelf={shelf} impressionSource="profile" />
							</li>
						))}
					</ul>
				)}
			</StatsSection>

			<StatsSection
				id="friends"
				title="Friends"
				description="The friend count is public; the list is not."
			>
				<StatRow items={[{ label: "Friends", value: n(friends.count) }]} />
			</StatsSection>
		</div>
	);
}
