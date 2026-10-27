"use client";

import type { AdminShelfOverviewOutput } from "@bbrc/api/modules/admin/admin-shelf.schema";
import { Badge } from "@bbrc/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@bbrc/ui/components/card";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import {
	adminShelfStatusFilterLabels,
	shelfTypeFilterLabels,
} from "@/lib/listing/admin-shelves-listing";

type ShelfRankingItem =
	AdminShelfOverviewOutput["rankings"]["mostBooks"][number];

function formatShelfMetric(
	item: ShelfRankingItem,
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

function shelfPublicHref(ownerUsername: string, slug: string): Route {
	return `/users/${ownerUsername}/shelves/${slug}` as Route;
}

function ShelfRankingRow({
	item,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	item: ShelfRankingItem;
	metricLabel: string;
	secondaryLabel?: string;
	formatAsDate?: boolean;
}) {
	return (
		<li className="flex items-start gap-2 border-border border-b py-2 last:border-0">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href={shelfPublicHref(item.ownerUsername, item.slug)}
						className="line-clamp-2 font-medium text-sm hover:underline"
					>
						{item.title}
					</Link>
					<Badge variant="secondary">
						{adminShelfStatusFilterLabels[item.status]}
					</Badge>
				</div>
				<p className="text-muted-foreground text-xs">
					<Link
						href={`/users/${item.ownerUsername}` as Route}
						className="hover:underline"
					>
						@{item.ownerUsername}
					</Link>
					{" · "}
					<span className="font-mono">{item.slug}</span>
					{" · "}
					{shelfTypeFilterLabels[item.type]}
				</p>
				<p className="text-muted-foreground text-xs tabular-nums">
					{formatShelfMetric(item, metricLabel, formatAsDate)}
					{item.secondaryMetric != null && secondaryLabel
						? ` · ${secondaryLabel}: ${item.secondaryMetric}`
						: null}
				</p>
			</div>
		</li>
	);
}

function ShelfRankingCard({
	title,
	items,
	metricLabel,
	secondaryLabel,
	formatAsDate,
}: {
	title: string;
	items: ShelfRankingItem[];
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
							<ShelfRankingRow
								key={`${title}-${item.slug}-${item.ownerUsername}`}
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

type AdminShelfRankingListsProps = {
	rankings: AdminShelfOverviewOutput["rankings"];
};

export function AdminShelfRankingLists({
	rankings,
}: AdminShelfRankingListsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<ShelfRankingCard
				title="Most books"
				items={rankings.mostBooks}
				metricLabel="Books"
				secondaryLabel="Attachments"
			/>
			<ShelfRankingCard
				title="Most post attachments"
				items={rankings.mostPostAttachments}
				metricLabel="Attachments"
				secondaryLabel="Books"
			/>
			<ShelfRankingCard
				title="Recently updated"
				items={rankings.recentlyUpdated}
				metricLabel="Updated"
				secondaryLabel="Books"
				formatAsDate
			/>
			<ShelfRankingCard
				title="Empty shelves"
				items={rankings.emptyShelves}
				metricLabel="Books"
			/>
			<ShelfRankingCard
				title="Largest active shelves"
				items={rankings.largestActive}
				metricLabel="Books"
				secondaryLabel="Attachments"
			/>
		</div>
	);
}
