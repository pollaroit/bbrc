"use client";

import type { AdminPostOverviewOutput } from "@bbrc/api/modules/admin/admin-post.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";

type PostRankingItem = AdminPostOverviewOutput["rankings"]["mostLiked"][number];

type AuthorRankingItem =
	AdminPostOverviewOutput["rankings"]["mostAuthors"][number];

function formatPostMetric(
	item: PostRankingItem,
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

function PostRankingRow({
	item,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	item: PostRankingItem;
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
					<Link
						href={`/posts/${item.slug}` as Route}
						className="font-mono hover:underline"
					>
						{item.slug}
					</Link>
				</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					{formatPostMetric(item, metricLabel, formatAsDate)}
					{item.secondaryMetric != null && secondaryLabel
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
				</p>
			</div>
		</li>
	);
}

function PostRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	title: string;
	items: PostRankingItem[];
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
							<PostRankingRow
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
				<CardTitle className="text-sm">Most prolific authors</CardTitle>
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
									{item.metric} posts
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type AdminPostRankingListsProps = {
	rankings: AdminPostOverviewOutput["rankings"];
};

export function AdminPostRankingLists({
	rankings,
}: AdminPostRankingListsProps) {
	return (
		<div className="flex flex-col gap-4">
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				<PostRankingCard
					title="Most liked"
					items={rankings.mostLiked}
					metricLabel="Likes"
					secondaryLabel="Comments"
				/>
				<PostRankingCard
					title="Most commented"
					items={rankings.mostCommented}
					metricLabel="Comments"
					secondaryLabel="Likes"
				/>
				<PostRankingCard
					title="Longest content"
					items={rankings.longestContent}
					metricLabel="Characters"
					secondaryLabel="Likes"
				/>
				<PostRankingCard
					title="Most recently edited"
					items={rankings.mostEdited}
					metricLabel="Edited"
					secondaryLabel="Comments"
					formatAsDate
				/>
			</div>
			<AuthorRankingCard items={rankings.mostAuthors} />
		</div>
	);
}
