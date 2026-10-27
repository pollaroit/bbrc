"use client";

import {
	ACHIEVEMENT_CATEGORY_LABELS,
	type AchievementCategory,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { useState } from "react";
import { AchievementBadge } from "@/components/blocks/achievement-badge";
import {
	AchievementRow,
	achievementFocus,
} from "@/components/blocks/achievement-row";
import { SegmentedControl } from "@/components/blocks/segmented-control";
import { TierLadder } from "@/components/blocks/tier-ladder";
import { UserAvatar } from "@/components/blocks/user-avatar";
import { Link } from "@/i18n/navigation";
import {
	formatAchievementDate,
	percentLabel,
	rarityOf,
} from "@/lib/achievements/format";
import { orpc } from "@/utils/orpc";

const EARNERS_PAGE = 30;

type TierOption = { id: string; label: string; count?: number };

/** Everyone who has earned this achievement, filterable by their highest tier. */
function AllEarners({
	slug,
	tiers,
}: {
	slug: string;
	tiers: { tier: number; name: string }[];
}) {
	const [tier, setTier] = useState("all");
	const tierNumber = tier === "all" ? undefined : Number(tier);
	const query = useInfiniteQuery(
		orpc.achievement.listEarners.infiniteOptions({
			initialPageParam: 0,
			input: (offset: number) => ({
				slug,
				tier: tierNumber,
				offset,
				limit: EARNERS_PAGE,
			}),
			getNextPageParam: (last, pages) => {
				const loaded = pages.reduce((sum, page) => sum + page.items.length, 0);
				return loaded < last.total ? loaded : undefined;
			},
		}),
	);

	const first = query.data?.pages[0];
	const items = query.data?.pages.flatMap((page) => page.items) ?? [];
	const options: TierOption[] = [
		{
			id: "all",
			label: "All",
			count: first
				? Object.values(first.perTier).reduce((sum, n) => sum + n, 0)
				: undefined,
		},
		...tiers.map((entry) => ({
			id: String(entry.tier),
			label: entry.name || `Tier ${entry.tier}`,
			count: first?.perTier[String(entry.tier)] ?? 0,
		})),
	];

	return (
		<div className="flex flex-col gap-4">
			{tiers.length > 1 ? (
				<SegmentedControl
					label="Highest tier"
					value={tier}
					onChange={setTier}
					options={options}
				/>
			) : null}
			{query.isPending ? (
				<Skeleton className="h-40 w-full" aria-hidden />
			) : items.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nobody has reached this tier yet.
				</p>
			) : (
				<ul className="border-border border-t">
					{items.map((earner) => (
						<li key={earner.username}>
							<EarnerLink earner={earner} tiers={tiers} />
						</li>
					))}
				</ul>
			)}
			{query.hasNextPage ? (
				<Button
					variant="outline"
					size="sm"
					className="w-fit"
					disabled={query.isFetchingNextPage}
					onClick={() => void query.fetchNextPage()}
				>
					{query.isFetchingNextPage ? "Loading…" : "Show more"}
				</Button>
			) : null}
		</div>
	);
}

function EarnerLink({
	earner,
	tiers,
}: {
	earner: {
		username: string;
		name: string;
		image: string | null;
		tier: number;
		periodKey: string;
		earnedAt: string;
	};
	tiers: { tier: number; name: string }[];
}) {
	return (
		<Link
			href={`/users/${earner.username}/achievements` as Route}
			className="flex items-center gap-3 border-border border-b py-2.5 transition-colors hover:bg-muted/30"
		>
			<UserAvatar user={earner} className="size-8" />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium text-sm">
					{earner.name}
				</span>
				<span className="block truncate text-muted-foreground text-xs">
					{tiers[earner.tier - 1]?.name || "Earned"}
					{earner.periodKey ? ` ${earner.periodKey}` : ""} ·{" "}
					{formatAchievementDate(earner.earnedAt)}
				</span>
			</span>
		</Link>
	);
}

export function AchievementDetail({ slug }: { slug: string }) {
	const query = useQuery({
		...orpc.achievement.getBySlug.queryOptions({ input: { slug } }),
		retry: false,
	});
	const [showAll, setShowAll] = useState(false);
	const catalog = useQuery(orpc.achievement.list.queryOptions());

	if (query.isPending) {
		return <Skeleton className="h-96 w-full" aria-hidden />;
	}
	if (query.isError || !query.data) {
		return (
			<div className="flex flex-col items-start gap-3 border border-border p-6">
				<p className="font-heading font-semibold text-lg">
					This achievement is still a secret.
				</p>
				<p className="text-muted-foreground text-sm">
					Hidden achievements show up here once you earn them.
				</p>
				<Button
					render={<Link href={"/achievements" as Route} />}
					nativeButton={false}
					size="sm"
					variant="outline"
				>
					Back to achievements
				</Button>
			</div>
		);
	}

	const data = query.data;
	const focus = achievementFocus(data);
	const thresholds = data.tiers.map((tier) => tier.threshold);
	const category = data.category as AchievementCategory;
	const related = (catalog.data?.items ?? [])
		.filter((item) => item.category === data.category && item.key !== data.key)
		.slice(0, 3);

	let status = "Sign in to track your progress.";
	if (data.viewer) {
		if (focus.maxed) {
			status = "You have earned every tier.";
		} else if (focus.earned > 0) {
			status = `You are on tier ${focus.earned} of ${focus.tierCount}.`;
		} else if (focus.value > 0) {
			status = "You have started this one.";
		} else {
			status = "You have not started this yet.";
		}
	}

	return (
		<div className="flex flex-col gap-10">
			<Link
				href={"/achievements" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden />
				All achievements
			</Link>

			<header className="grid gap-8 border border-border bg-card p-5 sm:p-8 lg:grid-cols-[1fr_minmax(18rem,28rem)] lg:items-end">
				<div className="flex flex-col gap-5">
					<AchievementBadge
						icon={data.icon}
						tier={focus.earned}
						tierCount={focus.tierCount}
						size="lg"
					/>
					<div className="flex flex-col gap-2">
						<h1 className="font-heading font-semibold text-3xl tracking-tight sm:text-4xl">
							{data.name}
						</h1>
						<p className="max-w-prose text-base leading-relaxed">
							{focus.maxed ? data.tiers.at(-1)?.description : focus.description}
						</p>
						<p className="text-muted-foreground text-sm">
							<Link
								href={`/achievements?category=${data.category}` as Route}
								className="underline underline-offset-4 hover:text-foreground"
							>
								{ACHIEVEMENT_CATEGORY_LABELS[category]}
							</Link>
							{data.isYearly ? " · counted separately each year" : ""}
							{data.isHidden ? " · hidden until earned" : ""}
							{" · "}
							{status}
						</p>
					</div>
				</div>

				<div className="flex flex-col gap-3">
					<TierLadder
						size="lg"
						thresholds={thresholds}
						tier={focus.earned}
						progress={focus.progress}
						names={data.tiers.map((tier) => tier.name || data.name)}
					/>
					{data.viewer && focus.next != null && focus.value > 0 ? (
						<p className="text-muted-foreground text-sm tabular-nums">
							{focus.value.toLocaleString("en")} of{" "}
							{focus.next.toLocaleString("en")}
							{data.isYearly ? " this year" : ""} toward{" "}
							{data.tiers[(data.viewer.nextTier ?? 1) - 1]?.name ||
								"the next tier"}
						</p>
					) : null}
				</div>
			</header>

			<div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
				<section
					aria-labelledby="tiers-heading"
					className="flex flex-col gap-3"
				>
					<h2
						id="tiers-heading"
						className="font-heading font-semibold text-lg tracking-tight"
					>
						{data.tiers.length > 1 ? "Tier by tier" : "How to earn it"}
					</h2>
					<ol className="border-border border-t">
						{data.tiers.map((tier) => {
							const rarity = rarityOf(tier.earnedBy, data.memberCount);
							const mine = data.viewer?.earnedAtByTier[String(tier.tier)];
							return (
								<li
									key={tier.tier}
									className="grid grid-cols-[2rem_1fr] gap-x-3 gap-y-1 border-border border-b py-3 sm:grid-cols-[2rem_1fr_auto]"
								>
									<span
										className={
											mine
												? "font-heading font-semibold text-lg"
												: "font-heading text-lg text-muted-foreground/60"
										}
									>
										{tier.tier}
									</span>
									<span className="flex flex-col">
										<span className="font-medium text-sm">
											{tier.name || data.name}
										</span>
										<span className="text-muted-foreground text-sm">
											{tier.description}
										</span>
									</span>
									<span className="col-start-2 flex flex-col text-muted-foreground text-xs sm:col-start-3 sm:items-end">
										<span className={mine ? "text-foreground" : ""}>
											{mine
												? `Earned ${formatAchievementDate(mine)}`
												: "Not earned yet"}
										</span>
										<span>
											<span className={rarity.className}>{rarity.label}</span> ·{" "}
											{tier.earnedBy} of {data.memberCount} (
											{percentLabel(tier.earnedBy, data.memberCount)})
										</span>
									</span>
								</li>
							);
						})}
					</ol>
				</section>

				<section
					aria-labelledby="earners-heading"
					className="flex flex-col gap-3"
				>
					<h2
						id="earners-heading"
						className="font-heading font-semibold text-lg tracking-tight"
					>
						{showAll ? "Everyone who earned it" : "Recently earned by"}
					</h2>
					{showAll ? (
						<AllEarners slug={slug} tiers={data.tiers} />
					) : data.recentEarners.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nobody yet. Be the first!
						</p>
					) : (
						<ul className="border-border border-t">
							{data.recentEarners.map((earner) => (
								<li key={earner.username}>
									<EarnerLink earner={earner} tiers={data.tiers} />
								</li>
							))}
						</ul>
					)}
					{data.recentEarners.length > 0 ? (
						<Button
							variant="ghost"
							size="sm"
							className="w-fit"
							onClick={() => setShowAll((value) => !value)}
						>
							{showAll ? "Show recent only" : "Show everyone"}
						</Button>
					) : null}
				</section>
			</div>

			{related.length > 0 ? (
				<section
					aria-labelledby="related-heading"
					className="flex flex-col gap-3"
				>
					<h2
						id="related-heading"
						className="font-heading font-semibold text-lg tracking-tight"
					>
						More in {ACHIEVEMENT_CATEGORY_LABELS[category].toLowerCase()}
					</h2>
					<ul className="border-border border-t">
						{related.map((item) => (
							<li key={item.key}>
								<AchievementRow item={item} memberCount={data.memberCount} />
							</li>
						))}
					</ul>
				</section>
			) : null}
		</div>
	);
}
