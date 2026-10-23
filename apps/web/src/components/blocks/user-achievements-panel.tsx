"use client";

import type { UserAward } from "@bbrc/api/modules/achievement/achievement.schema";
import {
	ACHIEVEMENT_BY_KEY,
	ACHIEVEMENT_CATEGORIES,
	ACHIEVEMENT_CATEGORY_LABELS,
	type AchievementDefinition,
	describeTier,
	tierName,
} from "@bbrc/shared";
import { Button } from "@bbrc/ui/components/button";
import { Skeleton } from "@bbrc/ui/components/skeleton";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pin } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	AchievementBadge,
	TierPips,
} from "@/components/blocks/achievement-badge";
import { formatAchievementDate } from "@/lib/achievements/format";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { orpc, queryClient } from "@/utils/orpc";

const SHOWCASE_SLOTS = 4;

type Earned = {
	definition: AchievementDefinition;
	/** The member's best award for each period (one per year for yearly achievements). */
	best: UserAward[];
	highestTier: number;
	latest: UserAward;
};

function groupAwards(awards: UserAward[]): Earned[] {
	const byKey = new Map<string, UserAward[]>();
	for (const award of awards) {
		byKey.set(award.key, [...(byKey.get(award.key) ?? []), award]);
	}

	const earned: Earned[] = [];
	for (const [key, list] of byKey) {
		const definition = ACHIEVEMENT_BY_KEY.get(key);
		if (!definition) continue;
		const bestByPeriod = new Map<string, UserAward>();
		for (const award of list) {
			const current = bestByPeriod.get(award.periodKey);
			if (!current || award.tier > current.tier) {
				bestByPeriod.set(award.periodKey, award);
			}
		}
		const best = [...bestByPeriod.values()].sort((a, b) =>
			b.periodKey.localeCompare(a.periodKey),
		);
		earned.push({
			definition,
			best,
			highestTier: Math.max(...list.map((award) => award.tier)),
			latest: [...list].sort((a, b) =>
				b.earnedAt.localeCompare(a.earnedAt),
			)[0] as UserAward,
		});
	}
	return earned.sort((a, b) =>
		b.latest.earnedAt.localeCompare(a.latest.earnedAt),
	);
}

function awardLabel(
	definition: AchievementDefinition,
	award: UserAward,
): string {
	const name = tierName(definition, award.tier);
	return [name, award.periodKey].filter(Boolean).join(" ");
}

export function usePinnedAwards(username: string) {
	return useQuery(
		orpc.achievement.listByUsername.queryOptions({ input: { username } }),
	);
}

export function UserAchievementsPanel({ username }: { username: string }) {
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.isAdmin === true;
	const query = usePinnedAwards(username);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState<string[]>([]);
	const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

	const key = orpc.achievement.listByUsername.queryKey({ input: { username } });
	const showcase = useMutation(
		orpc.achievement.setShowcase.mutationOptions({
			onSuccess: () => {
				toast.success("Showcase updated");
				setEditing(false);
				void queryClient.invalidateQueries({ queryKey: key });
			},
			onError: (error) =>
				toast.error(error.message ?? "Could not save the showcase."),
		}),
	);
	const revoke = useMutation(
		orpc.achievement.revoke.mutationOptions({
			onSuccess: () => {
				toast.success("Award revoked");
				setConfirmRevoke(null);
				void queryClient.invalidateQueries({ queryKey: key });
			},
			onError: (error) =>
				toast.error(error.message ?? "Could not revoke the award."),
		}),
	);

	if (query.isPending) {
		return <Skeleton className="h-64 w-full" aria-hidden />;
	}
	if (query.isError || !query.data) {
		return (
			<p className="text-muted-foreground text-sm">
				Could not load achievements right now.
			</p>
		);
	}

	const data = query.data;
	const earned = groupAwards(data.awards);
	const pinned = data.awards
		.filter((award) => award.pinOrder != null)
		.sort((a, b) => (a.pinOrder ?? 0) - (b.pinOrder ?? 0));

	const startEditing = () => {
		setDraft(pinned.map((award) => award.id));
		setEditing(true);
	};
	const toggleDraft = (id: string) =>
		setDraft((current) =>
			current.includes(id)
				? current.filter((item) => item !== id)
				: current.length >= SHOWCASE_SLOTS
					? current
					: [...current, id],
		);

	return (
		<div className="flex flex-col gap-6">
			<section
				className="grid grid-cols-2 gap-3 sm:grid-cols-4"
				aria-label="Summary"
			>
				<div className="border border-border bg-muted/5 p-3">
					<p className="text-muted-foreground text-xs">Earned</p>
					<p className="font-semibold text-xl tabular-nums">
						{data.earnedCount}
						<span className="font-normal text-muted-foreground text-sm">
							{" "}
							of{" "}
							{data.totalAchievements +
								(data.earnedCount > data.totalAchievements ? 0 : 0)}
						</span>
					</p>
				</div>
				{ACHIEVEMENT_CATEGORIES.slice(0, 3).map((category) => {
					const count = earned.filter(
						(item) => item.definition.category === category,
					).length;
					return (
						<div key={category} className="border border-border bg-muted/5 p-3">
							<p className="text-muted-foreground text-xs">
								{ACHIEVEMENT_CATEGORY_LABELS[category]}
							</p>
							<p className="font-semibold text-xl tabular-nums">{count}</p>
						</div>
					);
				})}
			</section>

			<section className="flex flex-col gap-3" aria-label="Showcase">
				<div className="flex items-center justify-between gap-3">
					<h2 className="font-semibold text-base tracking-tight">Showcase</h2>
					{data.isOwner && earned.length > 0 ? (
						editing ? (
							<div className="flex gap-2">
								<Button
									size="sm"
									disabled={showcase.isPending}
									onClick={() => showcase.mutate({ awardIds: draft })}
								>
									Save showcase
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setEditing(false)}
								>
									Cancel
								</Button>
							</div>
						) : (
							<Button size="sm" variant="outline" onClick={startEditing}>
								<Pin data-icon="inline-start" aria-hidden="true" />
								Choose up to {SHOWCASE_SLOTS}
							</Button>
						)
					) : null}
				</div>
				{pinned.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{data.isOwner
							? "Pin up to four achievements to show them on your profile."
							: "Nothing pinned yet."}
					</p>
				) : (
					<ul className="flex flex-wrap gap-3">
						{pinned.map((award) => {
							const definition = ACHIEVEMENT_BY_KEY.get(award.key);
							if (!definition) return null;
							return (
								<li key={award.id}>
									<Link
										href={`/achievements/${definition.slug}` as Route}
										className="flex items-center gap-2 border border-border p-2 transition-colors hover:bg-muted/30"
									>
										<AchievementBadge
											icon={definition.icon}
											tier={award.tier}
											tierCount={definition.thresholds.length}
											size="sm"
										/>
										<span className="text-sm">
											{definition.name}
											<span className="block text-muted-foreground text-xs">
												{awardLabel(definition, award) || "Earned"}
											</span>
										</span>
									</Link>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			<section className="flex flex-col gap-3" aria-label="Earned achievements">
				<h2 className="font-semibold text-base tracking-tight">
					Earned {editing ? "· tap to pin or unpin" : ""}
				</h2>
				{earned.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						{data.isOwner
							? "Nothing yet. Mark a book as read to get started."
							: "No achievements yet."}
					</p>
				) : (
					<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{earned.map((item) => {
							const { definition } = item;
							const tierCount = definition.thresholds.length;
							const award = item.best[0] as UserAward;
							const selected = item.best.some((entry) =>
								draft.includes(entry.id),
							);
							return (
								<li key={definition.key} className="min-h-0">
									<div
										className={cn(
											"relative flex h-full gap-3 border bg-card p-3",
											editing && selected
												? "border-foreground"
												: "border-border",
										)}
									>
										<AchievementBadge
											icon={definition.icon}
											tier={item.highestTier}
											tierCount={tierCount}
										/>
										<div className="flex min-w-0 flex-1 flex-col gap-1">
											<div className="flex items-center justify-between gap-2">
												<Link
													href={`/achievements/${definition.slug}` as Route}
													className="truncate font-medium text-sm hover:underline"
												>
													{definition.name}
												</Link>
												<TierPips
													tier={item.highestTier}
													tierCount={tierCount}
												/>
											</div>
											<p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
												{describeTier(definition, item.highestTier)}
											</p>
											<p className="mt-auto text-2xs text-muted-foreground">
												{item.best.length > 1
													? item.best
															.map((entry) => entry.periodKey || "")
															.filter(Boolean)
															.join(", ")
													: awardLabel(definition, award) || "Earned"}{" "}
												· {formatAchievementDate(award.earnedAt)}
											</p>
										</div>
										{editing ? (
											<button
												type="button"
												className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-ring"
												aria-pressed={selected}
												aria-label={`${selected ? "Unpin" : "Pin"} ${definition.name}`}
												onClick={() => toggleDraft(award.id)}
											/>
										) : null}
										{isAdmin && !editing ? (
											<div className="absolute end-2 top-2">
												{confirmRevoke === award.id ? (
													<Button
														size="xs"
														variant="destructive"
														disabled={revoke.isPending}
														onClick={() => revoke.mutate({ awardId: award.id })}
													>
														Confirm revoke
													</Button>
												) : (
													<Button
														size="xs"
														variant="ghost"
														onClick={() => setConfirmRevoke(award.id)}
													>
														Revoke
													</Button>
												)}
											</div>
										) : null}
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</section>

			{data.isOwner && data.progress.length > 0 ? (
				<section className="flex flex-col gap-3" aria-label="In progress">
					<h2 className="font-semibold text-base tracking-tight">Next up</h2>
					<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{[...data.progress]
							.sort((a, b) => b.value / (b.next ?? 1) - a.value / (a.next ?? 1))
							.slice(0, 6)
							.map((item) => {
								const definition = ACHIEVEMENT_BY_KEY.get(item.key);
								if (!definition || item.next == null) return null;
								const percent = Math.min(
									100,
									Math.round((item.value / item.next) * 100),
								);
								return (
									<li key={`${item.key}-${item.periodKey}`}>
										<Link
											href={`/achievements/${definition.slug}` as Route}
											className="flex items-center gap-3 border border-border p-3 transition-colors hover:bg-muted/30"
										>
											<AchievementBadge
												icon={definition.icon}
												tier={0}
												tierCount={definition.thresholds.length}
											/>
											<span className="flex min-w-0 flex-1 flex-col gap-1">
												<span className="truncate font-medium text-sm">
													{definition.name}
												</span>
												<span className="text-muted-foreground text-xs">
													{describeTier(definition, item.tier + 1)}
												</span>
												<span className="flex items-center gap-2 text-2xs text-muted-foreground tabular-nums">
													<span
														className="h-1.5 flex-1 border border-border bg-muted/30"
														role="progressbar"
														aria-valuenow={percent}
														aria-valuemin={0}
														aria-valuemax={100}
														aria-label={`Progress on ${definition.name}`}
													>
														<span
															className="block h-full bg-primary"
															style={{ width: `${percent}%` }}
														/>
													</span>
													{item.value.toLocaleString("en")} /{" "}
													{item.next.toLocaleString("en")}
												</span>
											</span>
										</Link>
									</li>
								);
							})}
					</ul>
				</section>
			) : null}

			{data.hiddenRemaining > 0 ? (
				<p className="border border-border bg-muted/20 px-4 py-3 text-muted-foreground text-sm">
					{data.hiddenRemaining} hidden{" "}
					{data.hiddenRemaining === 1 ? "achievement is" : "achievements are"}{" "}
					still waiting to be discovered. You will know when you find one.
				</p>
			) : null}
		</div>
	);
}
