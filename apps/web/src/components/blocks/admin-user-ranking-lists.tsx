"use client";

import type { AdminUserOverviewOutput } from "@bbrc/api/modules/admin/admin-user.schema";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import Link from "next/link";
import { UserAvatar } from "@/components/blocks/user-avatar";

type UserRankingItem = AdminUserOverviewOutput["rankings"]["mostXp"][number];

function formatJoinedMetric(metric: number) {
	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(new Date(metric));
}

function UserRankingRow({
	item,
	metricLabel,
	formatMetric,
}: {
	item: UserRankingItem;
	metricLabel: string;
	formatMetric?: (value: number) => string;
}) {
	const metricDisplay = formatMetric
		? formatMetric(item.metric)
		: String(item.metric);

	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<UserAvatar user={item} className="size-8" />
			<div className="min-w-0 flex-1">
				<Link
					href={`/users/${item.username}` as Route}
					className="line-clamp-2 font-medium text-sm hover:underline"
				>
					{item.name}
				</Link>
				<p className="truncate text-muted-foreground text-xs">
					@{item.username}
				</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					{metricLabel}: {metricDisplay}
				</p>
			</div>
		</li>
	);
}

function UserRankingCard({
	title,
	items,
	metricLabel,
	formatMetric,
}: {
	title: string;
	items: UserRankingItem[];
	metricLabel: string;
	formatMetric?: (value: number) => string;
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
							<UserRankingRow
								key={item.username}
								item={item}
								metricLabel={metricLabel}
								formatMetric={formatMetric}
							/>
						))}
					</ul>
				)}
			</CardContent>
		</Card>
	);
}

type AdminUserRankingListsProps = {
	rankings: AdminUserOverviewOutput["rankings"];
};

export function AdminUserRankingLists({
	rankings,
}: AdminUserRankingListsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<UserRankingCard
				title="Most XP"
				items={rankings.mostXp}
				metricLabel="XP"
			/>
			<UserRankingCard
				title="Most RP"
				items={rankings.mostRp}
				metricLabel="RP"
			/>
			<UserRankingCard
				title="Most posts"
				items={rankings.mostPosts}
				metricLabel="Posts"
			/>
			<UserRankingCard
				title="Most comments"
				items={rankings.mostComments}
				metricLabel="Comments"
			/>
			<UserRankingCard
				title="Most likes"
				items={rankings.mostLikes}
				metricLabel="Likes"
			/>
			<UserRankingCard
				title="Most feedbacks"
				items={rankings.mostFeedbacks}
				metricLabel="Feedbacks"
			/>
			<UserRankingCard
				title="Most sittings"
				items={rankings.mostParticipations}
				metricLabel="Participations"
			/>
			<UserRankingCard
				title="Most favorites"
				items={rankings.mostFavorites}
				metricLabel="Favorites"
			/>
			<UserRankingCard
				title="Most shelves"
				items={rankings.mostShelves}
				metricLabel="Shelves"
			/>
			<UserRankingCard
				title="Most book requests"
				items={rankings.mostBookRequests}
				metricLabel="Requests"
			/>
			<UserRankingCard
				title="Newest members"
				items={rankings.newestMembers}
				metricLabel="Joined"
				formatMetric={formatJoinedMetric}
			/>
		</div>
	);
}
