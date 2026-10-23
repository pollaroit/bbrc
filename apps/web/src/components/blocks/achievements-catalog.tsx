"use client";

import type {
	AchievementSummary,
	ListAchievementsOutput,
} from "@bbrc/api/modules/achievement/achievement.schema";
import {
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENT_CATEGORY_LABELS,
	type AchievementCategory,
} from "@bbrc/shared";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import {
	AchievementBadge,
	TierPips,
} from "@/components/blocks/achievement-badge";
import { ListingToggleChip } from "@/components/listing/listing-toggle-chip";
import { percentLabel, rarityOf } from "@/lib/achievements/format";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const STATUS_FILTERS = ["all", "earned", "progress", "todo"] as const;
const STATUS_LABELS = {
	all: "All",
	earned: "Earned",
	progress: "In progress",
	todo: "Not started",
} as const;

function statusOf(item: AchievementSummary): "earned" | "progress" | "todo" {
	const earned = item.viewer?.tier ?? 0;
	if (earned > 0) return "earned";
	return (item.viewer?.value ?? 0) > 0 ? "progress" : "todo";
}

export function AchievementCard({
	item,
	memberCount,
}: {
	item: AchievementSummary;
	memberCount: number;
}) {
	const tierCount = item.tiers.length;
	const earned = item.viewer?.tier ?? 0;
	const maxed = earned >= tierCount;
	const target = item.tiers[Math.min(earned, tierCount - 1)];
	const first = item.tiers[0];
	const rarity = rarityOf(first?.earnedBy ?? 0, memberCount);
	const next = item.viewer?.next ?? null;
	const value = item.viewer?.value ?? 0;
	const percent =
		next != null && !maxed
			? Math.min(100, Math.round((value / next) * 100))
			: 0;

	return (
		<Link
			href={`/achievements/${item.slug}` as Route}
			className="flex h-full gap-3 border border-border bg-card p-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
		>
			<AchievementBadge icon={item.icon} tier={earned} tierCount={tierCount} />
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex items-center justify-between gap-2">
					<span className="truncate font-medium text-sm">{item.name}</span>
					<TierPips tier={earned} tierCount={tierCount} />
				</span>
				<span className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
					{target?.description}
				</span>
				{item.viewer && !maxed && next != null && value > 0 ? (
					<span className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground tabular-nums">
						<span
							className="h-1.5 flex-1 border border-border bg-muted/30"
							role="progressbar"
							aria-valuenow={percent}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label={`Progress on ${item.name}`}
						>
							<span
								className="block h-full bg-primary"
								style={{ width: `${percent}%` }}
							/>
						</span>
						{value.toLocaleString("en")} / {next.toLocaleString("en")}
					</span>
				) : null}
				<span className="mt-auto flex items-center justify-between gap-2 pt-1 text-2xs text-muted-foreground">
					<span className={rarity.className}>{rarity.label}</span>
					<span>
						{percentLabel(first?.earnedBy ?? 0, memberCount)} of members
					</span>
				</span>
			</span>
		</Link>
	);
}

export function AchievementsCatalog() {
	const { data: session } = authClient.useSession();
	const query = useQuery(orpc.achievement.list.queryOptions());
	const [category, setCategory] = useQueryState(
		"category",
		parseAsStringLiteral(ACHIEVEMENT_CATEGORIES),
	);
	const [status, setStatus] = useQueryState(
		"status",
		parseAsStringLiteral(STATUS_FILTERS).withDefault("all"),
	);

	if (query.isPending) {
		return (
			<div
				className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
				aria-hidden
			>
				{Array.from({ length: 9 }, (_, index) => (
					<Skeleton key={index} className="h-28 w-full" />
				))}
			</div>
		);
	}
	if (query.isError || !query.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load achievements. Try again in a moment.
			</p>
		);
	}

	const data: ListAchievementsOutput = query.data;
	const signedIn = Boolean(session?.user);
	const visible = data.items.filter(
		(item) =>
			(category == null || item.category === category) &&
			(status === "all" || statusOf(item) === status),
	);
	const earnedCount = data.items.filter(
		(item) => (item.viewer?.tier ?? 0) > 0,
	).length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3 border border-border p-3">
				<div className="flex flex-wrap items-center gap-2">
					<ListingToggleChip
						pressed={category == null}
						onPressedChange={() => void setCategory(null)}
					>
						All categories
					</ListingToggleChip>
					{ACHIEVEMENT_CATEGORIES.map((value: AchievementCategory) => (
						<ListingToggleChip
							key={value}
							pressed={category === value}
							onPressedChange={(pressed) =>
								void setCategory(pressed ? value : null)
							}
						>
							{ACHIEVEMENT_CATEGORY_LABELS[value]}
						</ListingToggleChip>
					))}
				</div>
				{signedIn ? (
					<div className="flex flex-wrap items-center gap-2">
						{STATUS_FILTERS.map((value) => (
							<ListingToggleChip
								key={value}
								pressed={status === value}
								onPressedChange={() =>
									void setStatus(value === "all" ? null : value)
								}
							>
								{STATUS_LABELS[value]}
							</ListingToggleChip>
						))}
					</div>
				) : null}
			</div>

			<p className="border-border border-b pb-2 font-medium text-muted-foreground text-sm tabular-nums">
				{signedIn
					? `You have earned ${earnedCount} of ${data.items.length} listed achievements`
					: `${data.items.length} achievements to earn`}
				{data.hiddenRemaining > 0
					? ` · ${data.hiddenRemaining} hidden ${data.hiddenRemaining === 1 ? "one is" : "ones are"} waiting to be discovered`
					: ""}
			</p>

			{visible.length === 0 ? (
				<p className="py-10 text-center text-muted-foreground text-sm">
					Nothing matches these filters.
				</p>
			) : (
				<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					{visible.map((item) => (
						<li key={item.key} className="min-h-0">
							<AchievementCard item={item} memberCount={data.memberCount} />
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
