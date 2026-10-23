import type { AchievementSummary } from "@bbrc/api/modules/achievement/achievement.schema";
import type { Route } from "next";
import Link from "next/link";
import { AchievementBadge } from "@/components/blocks/achievement-badge";
import { TierLadder } from "@/components/blocks/tier-ladder";
import { percentLabel, rarityOf } from "@/lib/achievements/format";
import { cn } from "@/lib/utils";

export type AchievementState = "earned" | "started" | "locked";

export function achievementState(item: AchievementSummary): AchievementState {
	if ((item.viewer?.tier ?? 0) > 0) return "earned";
	return (item.viewer?.value ?? 0) > 0 ? "started" : "locked";
}

/** What the member is working toward: the next tier's wording, or the top tier once everything is earned. */
export function achievementFocus(item: AchievementSummary) {
	const tierCount = item.tiers.length;
	const earned = item.viewer?.tier ?? 0;
	const maxed = earned >= tierCount;
	const nextTier = maxed
		? tierCount
		: (item.viewer?.nextTier ?? Math.min(earned + 1, tierCount));
	const tier = item.tiers[nextTier - 1] ?? item.tiers[0];
	const next = maxed ? null : (item.viewer?.next ?? tier?.threshold ?? null);
	const value = item.viewer?.value ?? 0;
	return {
		tierCount,
		earned,
		maxed,
		description: tier?.description ?? "",
		next,
		value,
		progress: next ? Math.min(1, value / next) : maxed ? 1 : 0,
	};
}

const STATE_BAR: Record<AchievementState, string> = {
	earned: "bg-foreground",
	started: "bg-primary/60",
	locked: "bg-transparent",
};

/** One achievement as a line in a list: badge, wording, tier ladder, and progress or rarity. */
export function AchievementRow({
	item,
	memberCount,
}: {
	item: AchievementSummary;
	memberCount: number;
}) {
	const state = achievementState(item);
	const focus = achievementFocus(item);
	const first = item.tiers[0];
	const rarity = rarityOf(first?.earnedBy ?? 0, memberCount);
	const tierLabel = focus.earned > 0 ? item.tiers[focus.earned - 1]?.name : "";

	return (
		<Link
			href={`/achievements/${item.slug}` as Route}
			className="group relative grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 border-border border-b py-4 ps-4 pe-3 transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none sm:grid-cols-[auto_1fr_11rem]"
		>
			<span
				aria-hidden
				className={cn("absolute inset-y-0 start-0 w-0.5", STATE_BAR[state])}
			/>
			<AchievementBadge
				icon={item.icon}
				tier={focus.earned}
				tierCount={focus.tierCount}
			/>
			<span className="flex min-w-0 flex-col gap-0.5">
				<span className="flex flex-wrap items-baseline gap-x-2">
					<span
						className={cn(
							"font-heading font-semibold text-sm",
							state === "locked" && "text-muted-foreground",
						)}
					>
						{item.name}
					</span>
					{tierLabel ? (
						<span className="text-muted-foreground text-xs">{tierLabel}</span>
					) : null}
					{item.isYearly ? (
						<span className="text-muted-foreground text-xs">each year</span>
					) : null}
				</span>
				<span
					className={cn(
						"text-xs leading-relaxed",
						state === "locked"
							? "text-muted-foreground/80"
							: "text-muted-foreground",
					)}
				>
					{focus.maxed
						? `All tiers earned. ${focus.description}`
						: focus.description}
				</span>
			</span>
			<span className="col-span-2 flex items-center justify-between gap-4 ps-16 sm:col-span-1 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5 sm:ps-0">
				<TierLadder
					thresholds={item.tiers.map((tier) => tier.threshold)}
					tier={focus.earned}
					progress={focus.progress}
				/>
				{item.viewer && focus.next != null && focus.value > 0 ? (
					<span className="flex items-center gap-2 text-2xs text-muted-foreground tabular-nums">
						<span
							className="h-1 w-16 bg-border"
							role="progressbar"
							aria-valuenow={Math.round(focus.progress * 100)}
							aria-valuemin={0}
							aria-valuemax={100}
							aria-label={`Progress on ${item.name}`}
						>
							<span
								className="block h-full bg-primary"
								style={{ width: `${Math.round(focus.progress * 100)}%` }}
							/>
						</span>
						{focus.value.toLocaleString("en")} /{" "}
						{focus.next.toLocaleString("en")}
					</span>
				) : (
					<span className="text-2xs text-muted-foreground">
						<span className={rarity.className}>{rarity.label}</span>
						{" · "}
						{percentLabel(first?.earnedBy ?? 0, memberCount)}
					</span>
				)}
			</span>
		</Link>
	);
}
