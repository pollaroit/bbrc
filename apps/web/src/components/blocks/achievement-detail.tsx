"use client";

import {
	ACHIEVEMENT_CATEGORY_LABELS,
	type AchievementCategory,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { AchievementBadge } from "@/components/blocks/achievement-badge";
import {
	AchievementRow,
	achievementFocus,
} from "@/components/blocks/achievement-row";
import { TierLadder } from "@/components/blocks/tier-ladder";
import { UserAvatar } from "@/components/blocks/user-avatar";
import {
	formatAchievementDate,
	percentLabel,
	rarityOf,
} from "@/lib/achievements/format";
import { orpc } from "@/utils/orpc";

export function AchievementDetail({ slug }: { slug: string }) {
	const query = useQuery({
		...orpc.achievement.getBySlug.queryOptions({ input: { slug } }),
		retry: false,
	});
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
								href={`/achievements#${data.category}` as Route}
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
						Recently earned by
					</h2>
					{data.recentEarners.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Nobody yet. Be the first!
						</p>
					) : (
						<ul className="border-border border-t">
							{data.recentEarners.map((earner) => (
								<li key={earner.username}>
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
												{data.tiers[earner.tier - 1]?.name || "Earned"}
												{earner.periodKey ? ` ${earner.periodKey}` : ""} ·{" "}
												{formatAchievementDate(earner.earnedAt)}
											</span>
										</span>
									</Link>
								</li>
							))}
						</ul>
					)}
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
