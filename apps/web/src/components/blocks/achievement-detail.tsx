"use client";

import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import {
	AchievementBadge,
	achievementTierClassName,
} from "@/components/blocks/achievement-badge";
import { UserAvatar } from "@/components/blocks/user-avatar";
import {
	formatAchievementDate,
	percentLabel,
	rarityOf,
} from "@/lib/achievements/format";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export function AchievementDetail({ slug }: { slug: string }) {
	const query = useQuery({
		...orpc.achievement.getBySlug.queryOptions({ input: { slug } }),
		retry: false,
	});

	if (query.isPending) {
		return <Skeleton className="h-64 w-full" aria-hidden />;
	}
	if (query.isError || !query.data) {
		return (
			<div className="flex flex-col items-start gap-3 border border-border p-6">
				<p className="font-medium">This achievement is still a secret.</p>
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
	const tierCount = data.tiers.length;
	const earned = data.viewer?.tier ?? 0;
	const value = data.viewer?.value ?? 0;

	return (
		<div className="flex flex-col gap-6">
			<Link
				href={"/achievements" as Route}
				className="inline-flex w-fit items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden />
				All achievements
			</Link>

			<header className="flex flex-col gap-4 border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-6">
				<AchievementBadge
					icon={data.icon}
					tier={earned}
					tierCount={tierCount}
					size="lg"
				/>
				<div className="flex min-w-0 flex-col gap-1">
					<h1 className="font-bold text-2xl tracking-tight">{data.name}</h1>
					<p className="text-muted-foreground text-sm leading-relaxed">
						{data.tiers[0]?.description}
					</p>
					<p className="text-muted-foreground text-xs">
						{data.isYearly ? "Counted separately for each year. " : ""}
						{data.isHidden ? "A hidden achievement. " : ""}
						{earned > 0
							? `You have earned ${earned === tierCount ? "every tier" : `tier ${earned} of ${tierCount}`}.`
							: data.viewer
								? "You have not earned this yet."
								: "Sign in to track your progress."}
					</p>
				</div>
			</header>

			<section className="flex flex-col gap-2" aria-label="Tiers">
				<h2 className="font-semibold text-base tracking-tight">
					{tierCount > 1 ? "Tiers" : "How to earn it"}
				</h2>
				<ol className="flex flex-col gap-2">
					{data.tiers.map((tier) => {
						const rarity = rarityOf(tier.earnedBy, data.memberCount);
						const mine = data.viewer?.earnedAtByTier[String(tier.tier)];
						const isNext = earned + 1 === tier.tier;
						const percent =
							isNext && data.viewer?.next
								? Math.min(100, Math.round((value / data.viewer.next) * 100))
								: 0;
						return (
							<li
								key={tier.tier}
								className={cn(
									"flex flex-col gap-2 border p-3 sm:flex-row sm:items-center sm:justify-between",
									mine
										? achievementTierClassName(tier.tier, tierCount)
										: "border-border",
								)}
							>
								<div className="flex min-w-0 flex-col gap-0.5">
									<span className="font-medium text-sm">
										{tier.name || data.name}
									</span>
									<span className="text-sm">{tier.description}</span>
									{isNext && data.viewer && data.viewer.next ? (
										<span className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground tabular-nums">
											<span
												className="h-1.5 w-32 border border-border bg-muted/30"
												role="progressbar"
												aria-valuenow={percent}
												aria-valuemin={0}
												aria-valuemax={100}
												aria-label="Progress to this tier"
											>
												<span
													className="block h-full bg-primary"
													style={{ width: `${percent}%` }}
												/>
											</span>
											{value.toLocaleString("en")} /{" "}
											{data.viewer.next.toLocaleString("en")}
										</span>
									) : null}
								</div>
								<div className="flex shrink-0 flex-col items-start gap-0.5 text-2xs text-muted-foreground sm:items-end">
									<span>
										{mine
											? `Earned ${formatAchievementDate(mine)}`
											: "Not earned yet"}
									</span>
									<span>
										<span className={rarity.className}>{rarity.label}</span> ·{" "}
										{tier.earnedBy} {tier.earnedBy === 1 ? "member" : "members"}{" "}
										({percentLabel(tier.earnedBy, data.memberCount)})
									</span>
								</div>
							</li>
						);
					})}
				</ol>
			</section>

			<section className="flex flex-col gap-2" aria-label="Recent earners">
				<h2 className="font-semibold text-base tracking-tight">
					Recently earned by
				</h2>
				{data.recentEarners.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nobody yet. Be the first!
					</p>
				) : (
					<ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						{data.recentEarners.map((earner) => (
							<li key={earner.username}>
								<Link
									href={`/users/${earner.username}/achievements` as Route}
									className="flex items-center gap-3 border border-border p-2 transition-colors hover:bg-muted/30"
								>
									<UserAvatar user={earner} className="size-9" />
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
	);
}
