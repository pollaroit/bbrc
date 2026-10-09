"use client";

import type { AdminCommentOverviewOutput } from "@bbrc/api/modules/admin/admin-comment.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";
import { adminCommentContextLabels } from "@/lib/listing/admin-comments-listing";

type CommentRankingItem =
	AdminCommentOverviewOutput["rankings"]["mostLiked"][number];

type AuthorRankingItem =
	AdminCommentOverviewOutput["rankings"]["mostAuthors"][number];

function commentRankingHref(item: CommentRankingItem): Route {
	const postPrefix = "Post · ";
	if (item.context === "post" && item.contextLabel.startsWith(postPrefix)) {
		const postSlug = item.contextLabel.slice(postPrefix.length);
		return `/posts/${postSlug}/comments/${item.slug}` as Route;
	}
	return `/admin/comments/list?search=${encodeURIComponent(item.slug)}` as Route;
}

function formatCommentMetric(
	item: CommentRankingItem,
	metricLabel: string,
	formatAsDate?: boolean,
) {
	if (formatAsDate && item.metric > 1_000_000_000_000) {
		const date = new Intl.DateTimeFormat(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		}).format(new Date(item.metric));
		return `${metricLabel}: ${date}`;
	}

	return `${metricLabel}: ${item.metric}`;
}

function CommentRankingRow({
	item,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	item: CommentRankingItem;
	metricLabel: string;
	secondaryLabel?: string;
	formatAsDate?: boolean;
}) {
	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="min-w-0 flex-1">
				<p className="line-clamp-2 text-sm">{item.contentPreview}</p>
				<p className="text-muted-foreground text-xs">
					<Link
						href={`/users/${item.authorUsername}` as Route}
						className="hover:underline"
					>
						@{item.authorUsername}
					</Link>
					{" · "}
					{adminCommentContextLabels[item.context]}
					{" · "}
					<Link
						href={commentRankingHref(item)}
						className="font-mono hover:underline"
					>
						{item.slug}
					</Link>
				</p>
				<p className="text-muted-foreground text-xs">{item.contextLabel}</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					{formatCommentMetric(item, metricLabel, formatAsDate)}
					{item.secondaryMetric != null && secondaryLabel
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
				</p>
			</div>
		</li>
	);
}

function CommentRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	title: string;
	items: CommentRankingItem[];
	metricLabel: string;
	secondaryLabel?: string;
	formatAsDate?: boolean;
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
							<CommentRankingRow
								key={`${title}-${item.slug}`}
								item={item}
								metricLabel={metricLabel}
								secondaryLabel={secondaryLabel}
								formatAsDate={formatAsDate}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

function AuthorRankingCard({ items }: { items: AuthorRankingItem[] }) {
	return (
		<Card size="sm">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm">Most prolific commenters</CardTitle>
			</CardHeader>
			<CardContent>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-xs">No data yet.</p>
				) : (
					<ul>
						{items.map((item) => (
							<li
								key={item.authorUsername}
								className="flex items-center justify-between gap-2 border-border border-b py-2 last:border-0"
							>
								<Link
									href={`/users/${item.authorUsername}` as Route}
									className="font-medium text-sm hover:underline"
								>
									@{item.authorUsername}
								</Link>
								<span className="text-muted-foreground text-xs tabular-nums">
									{item.metric} comments
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type AdminCommentRankingListsProps = {
	rankings: AdminCommentOverviewOutput["rankings"];
};

export function AdminCommentRankingLists({
	rankings,
}: AdminCommentRankingListsProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<CommentRankingCard
					title="Most liked"
					items={rankings.mostLiked}
					metricLabel="Likes"
					secondaryLabel="Replies"
				/>
				<CommentRankingCard
					title="Most replies"
					items={rankings.mostReplies}
					metricLabel="Replies"
					secondaryLabel="Likes"
				/>
				<CommentRankingCard
					title="Longest content"
					items={rankings.longestContent}
					metricLabel="Characters"
					secondaryLabel="Likes"
				/>
				<CommentRankingCard
					title="Most recently edited"
					items={rankings.mostEdited}
					metricLabel="Edited"
					secondaryLabel="Likes"
					formatAsDate
				/>
			</div>
			<AuthorRankingCard items={rankings.mostAuthors} />
		</div>
	);
}
